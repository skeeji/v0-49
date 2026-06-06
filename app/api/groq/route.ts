import { type NextRequest, NextResponse } from "next/server"

const GROQ_API_KEY = process.env.GROQ_API_KEY

const SYSTEM_DESCRIBE = `Tu es un expert en luminaires de collection et en histoire du design décoratif, spécialisé dans les pièces du XIXe au XXe siècle. Tu travailles pour Gersaint Paris, maison spécialisée dans l'expertise et la vente de luminaires anciens et de collection.
Présente les résultats de façon naturelle, experte et concise (1-2 phrases max). Cite les noms et artistes trouvés. Langue : français. Ton : professionnel, chaleureux. Ne pas inventer de prix ni de dates.`

const SYSTEM_PLAN = `Tu es l'orchestrateur d'un chatbot de recherche de luminaires anciens et de collection (Gersaint Paris, 9002 luminaires en base).
Analyse la conversation et génère les paramètres de recherche optimaux.
Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans markdown.
Format exact : {"query": "mots-clés", "top_k": 3}

Règles :
- query : extrais les critères pertinents (style, matériau, époque, couleur, forme, type). Si l'utilisateur dit "même mais en X" ou "plus récent" ou affine un résultat précédent, conserve le contexte des résultats précédents et ajoute le nouveau critère. Mots-clés concis, pas une phrase.
- top_k : si l'utilisateur mentionne un nombre ("6 luminaires", "montre-en 10", "plus de résultats"), utilise ce nombre. Sinon : 3. Maximum absolu : 12.`

async function callGroq(systemPrompt: string, userMessage: string, maxTokens: number, temperature: number) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  })
  if (!response.ok) throw new Error(`Groq error ${response.status}`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content || null
}

export async function POST(request: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const mode = body.mode || "describe"

    // ── MODE PLAN : analyse conversation → retourne {query, top_k} ──
    if (mode === "plan") {
      const { conversation = [], currentMessage, hasImage } = body

      const convSummary = (conversation as any[]).slice(-8).map((m: any) => {
        let line = `${m.role === "user" ? "Client" : "Assistant"}: ${m.content}`
        if (m.results?.length > 0) {
          const names = (m.results as any[])
            .slice(0, 4)
            .map((r: any) => [r.nom, r.artiste].filter(Boolean).join(" — "))
            .filter(Boolean)
            .join(", ")
          if (names) line += ` [résultats trouvés : ${names}]`
        }
        return line
      }).join("\n")

      const userMessage = `Conversation :\n${convSummary}\n\nNouveau message du client : "${currentMessage}"${hasImage ? " [avec une image jointe]" : ""}\n\nGénère les paramètres de recherche JSON.`

      try {
        const raw = await callGroq(SYSTEM_PLAN, userMessage, 80, 0.1)
        const cleaned = (raw || "{}").replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(cleaned)
        return NextResponse.json({
          query: parsed.query || currentMessage,
          top_k: Math.min(Math.max(parseInt(String(parsed.top_k)) || 3, 1), 12),
        })
      } catch {
        return NextResponse.json({ query: currentMessage, top_k: 3 })
      }
    }

    // ── MODE DESCRIBE : résultats trouvés → phrase de présentation ──
    const { query, searchContext, results } = body

    const userMessage = `Le client recherche : "${query}"
Contexte de la conversation : "${searchContext}"
Résultats trouvés : ${JSON.stringify(results, null, 2)}

Génère une réponse naturelle présentant ces résultats.`

    try {
      const message = await callGroq(SYSTEM_DESCRIBE, userMessage, 100, 0.7)
      return NextResponse.json({ message })
    } catch {
      return NextResponse.json({ message: null })
    }

  } catch (error: any) {
    console.error("Erreur route /api/groq:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
