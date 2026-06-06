import { type NextRequest, NextResponse } from "next/server"

const URL_TEXTE = "https://chatbot-984654216979.europe-west1.run.app/api/search_text"
const URL_IMAGE = "https://image-similarity-api-590690354412.us-central1.run.app/api/search"

function normalizeId(raw: string): string {
  return raw.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, "").trim()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const query = String(formData.get("query") || "").trim()
    const topK = Math.min(Math.max(parseInt(String(formData.get("top_k") || "3")), 1), 20)
    const imageFile = formData.get("image") as File | null

    console.log(`[FUSION:api] ▶ query="${query}" | image=${!!imageFile} | top_k=${topK}`)

    const fetchText = async (): Promise<any[]> => {
      if (!query) return []
      try {
        const t0 = Date.now()
        const res = await fetch(URL_TEXTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, top_k: topK * 6 }),
          signal: AbortSignal.timeout(40000),
        })
        const data = await res.json()
        const results = data.results || []
        console.log(`[FUSION:api] ✅ API Texte: ${results.length} résultats en ${Date.now() - t0}ms`)
        return results
      } catch (e) {
        console.error("[FUSION:api] ❌ API Texte:", e)
        return []
      }
    }

    const fetchImage = async (): Promise<any[]> => {
      if (!imageFile) return []
      try {
        const t0 = Date.now()
        const fd = new FormData()
        fd.append("image", imageFile)
        fd.append("top_k", String(topK * 6))
        const res = await fetch(URL_IMAGE, {
          method: "POST",
          body: fd,
          signal: AbortSignal.timeout(30000),
        })
        const data = await res.json()
        const results = data.results || []
        console.log(`[FUSION:api] ✅ API Image: ${results.length} résultats en ${Date.now() - t0}ms`)
        return results
      } catch (e) {
        console.error("[FUSION:api] ❌ API Image:", e)
        return []
      }
    }

    const [resText, resImg] = await Promise.all([fetchText(), fetchImage()])

    // Fusion par ID normalisé
    const combined = new Map<string, { scoreText: number; scoreImg: number; data: any }>()

    for (const item of resText) {
      const rawId = item.luminaireId || item.image_url?.split("/").pop() || ""
      const key = normalizeId(rawId)
      if (key) combined.set(key, { scoreText: item.similarity || 0, scoreImg: 0, data: item })
    }

    for (const item of resImg) {
      const rawId = item.image_id || item.image_url?.split("/").pop() || ""
      const key = normalizeId(rawId)
      if (!key) continue
      const existing = combined.get(key)
      if (existing) {
        existing.scoreImg = item.similarity || 0
        console.log(`[FUSION:api] 🔗 Match texte+image: "${key}" (text=${existing.scoreText.toFixed(2)}, img=${existing.scoreImg.toFixed(2)})`)
      } else {
        combined.set(key, { scoreText: 0, scoreImg: item.similarity || 0, data: item })
      }
    }

    const hasText = query.length > 0 && resText.length > 0
    const hasImg = imageFile !== null && resImg.length > 0
    const wText = hasText && hasImg ? 0.5 : hasText ? 1.0 : 0.0
    const wImg = hasText && hasImg ? 0.5 : hasImg ? 1.0 : 0.0

    console.log(`[FUSION:api] 🔀 Fusion: ${combined.size} candidats | poids text=${wText} img=${wImg}`)

    const ranked = Array.from(combined.values())
      .sort((a, b) => (b.scoreText * wText + b.scoreImg * wImg) - (a.scoreText * wText + a.scoreImg * wImg))
      .slice(0, topK)
      .map((e) => e.data)

    console.log(`[FUSION:api] ✅ Retour: ${ranked.length} résultats`)
    return NextResponse.json({ success: true, results: ranked })
  } catch (e: any) {
    console.error("[FUSION:api] ❌ Crash:", e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
