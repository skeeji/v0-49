import { type NextRequest, NextResponse } from "next/server"

const GROQ_API_KEY = process.env.GROQ_API_KEY

const SYSTEM_PROMPT = `Tu es un expert en luminaires de collection et en histoire du design décoratif, spécialisé dans les pièces du XIXe au XXe siècle. Tu travailles pour Gersaint Paris, maison spécialisée dans l'expertise et la vente de luminaires anciens et de collection.
Ton rôle : répondre à la recherche d'un client de façon naturelle, experte et concise (2-3 phrases maximum). Tu mentionnes les luminaires trouvés par leur nom et artiste. Tu parles de façon fluide, comme un expert qui présente une sélection.
Langue : toujours en français.
Ton : professionnel, chaleureux, érudit mais accessible.
Ne pas inventer de prix ni de dates non confirmées.`

export async function POST(request: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 })
  }

  try {
    const { query, searchContext, results } = await request.json()

    const userMessage = `Le client recherche : "${query}"
Contexte de la conversation : "${searchContext}"
Résultats trouvés : ${JSON.stringify(results, null, 2)}

Génère une réponse naturelle présentant ces résultats.`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Groq API error:", error)
      return NextResponse.json({ error: "Groq API error" }, { status: 502 })
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message?.content || null

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error("Erreur route /api/groq:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
