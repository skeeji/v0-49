import { type NextRequest, NextResponse } from "next/server"

const URL_TEXTE = "https://chatbot-984654216979.europe-west1.run.app/api/search_text"
const URL_IMAGE = "https://image-similarity-api-590690354412.us-central1.run.app/api/search"

// Seuil à calibrer après observation des logs en production.
// Les scores de l'API image GCP sont souvent dans la plage 0.5–0.80 pour des proches visuels ;
// 0.75 est un compromis raisonnable par défaut. Monter à 0.85+ si les faux positifs sont fréquents,
// descendre à 0.65 si les quasi-identiques ne passent pas le filtre.
const SCORE_HIGH_THRESHOLD = 0.75 // Au-dessus : quasi-identique visuel trouvé → priorité image
const W_IMG_HIGH  = 0.8           // Poids image quand scoreImg > seuil
const W_TEXT_HIGH = 0.2
const W_IMG_LOW   = 0.2           // Poids image quand scoreImg ≤ seuil (sémantique prend le relais)
const W_TEXT_LOW  = 0.8

function normalizeId(raw: string): string {
  return raw.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, "").trim()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const query = String(formData.get("query") || "").trim()
    const topK = Math.min(Math.max(parseInt(String(formData.get("top_k") || "3")), 1), 20)
    const imageFile = formData.get("image") as File | null

    // imageContextQuery : query construite depuis l'analyse sémantique de l'image (ex: "suspension conique laiton Art Déco").
    // Utilisée comme query texte quand les scores visuels sont faibles (< SCORE_HIGH_THRESHOLD).
    // La page l'envoie uniquement quand un imageContext est disponible.
    const imageContextQuery = String(formData.get("image_context_query") || "").trim()

    // La query effective pour la recherche texte : imageContextQuery est prioritaire sur query
    // quand une image est jointe (elle encode les critères sémantiques de l'image).
    const effectiveTextQuery = imageFile && imageContextQuery ? imageContextQuery : query

    console.log(`[FUSION:api] ▶ query="${query}" | imageContextQuery="${imageContextQuery}" | effectiveText="${effectiveTextQuery}" | image=${!!imageFile} | top_k=${topK}`)

    const fetchText = async (): Promise<any[]> => {
      if (!effectiveTextQuery) return []
      try {
        const t0 = Date.now()
        const res = await fetch(URL_TEXTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: effectiveTextQuery, top_k: topK * 6 }),
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

    const hasText = effectiveTextQuery.length > 0 && resText.length > 0
    const hasImg  = imageFile !== null && resImg.length > 0

    // Score visuel max — détermine si on a trouvé un quasi-identique ou non
    const maxScoreImg = hasImg
      ? resImg.reduce((max, r) => Math.max(max, r.similarity || 0), 0)
      : 0

    let wText: number
    let wImg: number

    if (hasText && hasImg) {
      if (maxScoreImg > SCORE_HIGH_THRESHOLD) {
        // Quasi-identique visuel trouvé → priorité à l'image
        wText = W_TEXT_HIGH
        wImg  = W_IMG_HIGH
        console.log(`[FUSION:api] 🎯 Score visuel élevé (${maxScoreImg.toFixed(3)} > ${SCORE_HIGH_THRESHOLD}) → poids image=${wImg}`)
      } else {
        // Pas de match fort → priorité à la sémantique texte
        wText = W_TEXT_LOW
        wImg  = W_IMG_LOW
        console.log(`[FUSION:api] 📝 Score visuel faible (${maxScoreImg.toFixed(3)} ≤ ${SCORE_HIGH_THRESHOLD}) → poids texte=${wText}`)
      }
    } else if (hasText) {
      wText = 1.0; wImg = 0.0
    } else if (hasImg) {
      wText = 0.0; wImg = 1.0
    } else {
      wText = 0.0; wImg = 0.0
    }

    console.log(`[FUSION:api] 🔀 Fusion: ${combined.size} candidats | poids text=${wText} img=${wImg} | maxScoreImg=${maxScoreImg.toFixed(3)}`)

    const ranked = Array.from(combined.values())
      .sort((a, b) => (b.scoreText * wText + b.scoreImg * wImg) - (a.scoreText * wText + a.scoreImg * wImg))
      .slice(0, topK)
      .map((e) => e.data)

    console.log(`[FUSION:api] ✅ Retour: ${ranked.length} résultats`)
    return NextResponse.json({ success: true, results: ranked, maxScoreImg })
  } catch (e: any) {
    console.error("[FUSION:api] ❌ Crash:", e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
