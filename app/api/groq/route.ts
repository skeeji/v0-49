import { type NextRequest, NextResponse } from "next/server"

const GROQ_API_KEY = process.env.GROQ_API_KEY

const SYSTEM_DESCRIBE = `Tu es un expert en luminaires de collection et en histoire du design décoratif. Tu travailles pour Gersaint Paris.

RÈGLE ABSOLUE : les résultats qui te sont donnés sont TOUJOURS les meilleurs trouvés par notre moteur de recherche. Tu dois TOUJOURS les présenter. Ne dis JAMAIS "je n'ai pas trouvé", "malheureusement", "ne correspond pas" ou toute formule négative. Ces résultats existent et sont pertinents.

Présente les résultats de façon naturelle, experte et concise (1-2 phrases max).
Cite les noms des luminaires et artistes disponibles. Ne mentionne JAMAIS les champs vides.
Si une image a été jointe, commence par "Voici des luminaires proches de votre image :".
Langue : français. Ton : professionnel, chaleureux. Ne pas inventer de prix ni de dates.`

// Mode "route" : décide si le message nécessite une recherche ou une réponse directe.
// Fusionne l'ancien mode "plan" pour économiser un appel Groq.
const SYSTEM_ROUTE = `Tu es l'orchestrateur d'un chatbot de recherche de luminaires anciens (Gersaint Paris, 9002 pièces : lustres, suspensions, appliques, lampadaires, lampes de table, du XIXe au XXe siècle).

DÉCIDE si le message nécessite une recherche dans la base ou une réponse directe.

RECHERCHE — quand l'utilisateur décrit un objet à trouver : style, matériaux, époque, designer, forme, couleur, usage, ou affine/continue une recherche précédente ("même mais en...", "plus récent", "autre chose", "montre-en d'autres").
RÉPONSE DIRECTE — quand le message est : une question culturelle ou historique, une demande d'explication (différence entre X et Y, qu'est-ce que le style Z), une politesse (bonjour, merci), une question sur le processus.

Réponds UNIQUEMENT avec un JSON valide sur une seule ligne, sans texte avant ni après.

Si RECHERCHE : {"action":"search","query":"mots-clés extraits","top_k":3}
Si RÉPONSE DIRECTE : {"action":"answer","message":"ta réponse en français, 2-3 phrases max, ton expert et chaleureux"}

RÈGLES query (si search) :
- Extrais : style (Art Déco, Bauhaus, moderniste, scandinave...), matériau (laiton, verre, bronze, cristal...), époque (années 20, 1950s...), couleur, forme, designer
- "même mais en X" → reprend le contexte précédent + ajoute X
- "plus récent / plus ancien / plus grand" → adapte la requête
- "différent / autre chose" → garde le type mais change les critères secondaires
- image seule sans texte → query = "" (l'image est gérée séparément)
- image avec texte → utilise le texte comme critère
- Toujours mots-clés concis (pas de phrases)

RÈGLES top_k (si search) :
- Première recherche → 3
- Si l'utilisateur mentionne un nombre ("6 luminaires", "montre-en 10") → utilise ce nombre
- Affinage → même nombre que la fois précédente
- Maximum absolu : 12`

const SYSTEM_PLAN = `Tu es l'orchestrateur d'un chatbot de recherche de luminaires anciens et de collection (Gersaint Paris, 9002 luminaires en base : lustres, suspensions, appliques, lampadaires, lampes de table, du XIXe au XXe siècle).

Analyse la conversation et génère les paramètres de recherche optimaux.
Réponds UNIQUEMENT avec un JSON valide sur une seule ligne, sans texte avant ni après.
Format : {"query":"mots-clés","top_k":3}

RÈGLES POUR query :
- Extrais les critères : style (Art Déco, Bauhaus, moderniste, scandinave...), matériau (laiton, verre, bronze, cristal...), époque (années 20, 1950s...), couleur, forme (suspension, applique...), designer
- Si l'utilisateur dit "même mais en X" → reprend le contexte précédent + ajoute X
- Si l'utilisateur dit "plus récent / plus ancien / plus grand" → adapte la requête
- Si l'utilisateur dit "différent / autre chose" → garde le type mais change les critères secondaires
- Si image jointe sans texte → query = "" (chaîne vide — l'image est gérée directement, pas besoin de texte générique)
- Si image jointe avec texte → utilise uniquement le texte comme critère (l'image est déjà gérée séparément)
- Toujours en mots-clés concis (pas de phrases)

RÈGLES POUR top_k :
- Si l'utilisateur mentionne un nombre ("6 luminaires", "montre-en 10", "plus de résultats") → utilise ce nombre
- Si première recherche → 3
- Si affinage ("mais en or", "plus récent") → même nombre que la fois précédente
- Maximum absolu : 12`

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
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq ${response.status}: ${err}`)
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content || null
}

export async function POST(request: NextRequest) {
  if (!GROQ_API_KEY) {
    console.error("[GROQ] ❌ GROQ_API_KEY manquante")
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const mode = body.mode || "describe"

    // ── MODE ROUTE (fusion route + plan) ──
    // Décide si le message nécessite une recherche ou une réponse directe.
    // Si search : retourne aussi query + top_k pour éviter un appel plan séparé.
    if (mode === "route") {
      const { conversation = [], currentMessage, hasImage } = body

      const convSummary = (conversation as any[]).slice(-10).map((m: any) => {
        let line = `${m.role === "user" ? "Client" : "Assistant"}: ${m.content}`
        if (m.results?.length > 0) {
          const names = (m.results as any[])
            .slice(0, 4)
            .map((r: any) => [r.nom, r.artiste].filter(Boolean).join(" — "))
            .filter(Boolean)
            .join(" | ")
          if (names) line += ` [résultats: ${names}]`
        }
        return line
      }).join("\n")

      const userMsg = `Historique :\n${convSummary || "(première recherche)"}\n\nNouveau message : "${currentMessage}"${hasImage ? " [image jointe]" : ""}`

      console.log(`[GROQ:route] ▶ Appel LLM — ${conversation.length} msgs contexte`)

      try {
        const raw = await callGroq(SYSTEM_ROUTE, userMsg, 200, 0.1)
        console.log(`[GROQ:route] ✅ Réponse brute: ${raw}`)
        const cleaned = (raw || "{}").replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(cleaned)

        if (parsed.action === "answer") {
          console.log(`[GROQ:route] 💬 Réponse directe: "${parsed.message?.slice(0, 80)}..."`)
          return NextResponse.json({ action: "answer", message: parsed.message || "" })
        }

        // action === "search" (ou fallback)
        const result = {
          action: "search",
          query: String(parsed.query ?? currentMessage).trim(),
          top_k: Math.min(Math.max(parseInt(String(parsed.top_k)) || 3, 1), 12),
        }
        console.log(`[GROQ:route] 🔍 Recherche: query="${result.query}" | top_k=${result.top_k}`)
        return NextResponse.json(result)
      } catch (e) {
        console.warn("[GROQ:route] ❌ Parse échoué, fallback search:", e)
        return NextResponse.json({ action: "search", query: currentMessage, top_k: 3 })
      }
    }

    // ── MODE PLAN (conservé pour compatibilité) ──
    if (mode === "plan") {
      const { conversation = [], currentMessage, hasImage } = body

      const convSummary = (conversation as any[]).slice(-10).map((m: any) => {
        let line = `${m.role === "user" ? "Client" : "Assistant"}: ${m.content}`
        if (m.results?.length > 0) {
          const names = (m.results as any[])
            .slice(0, 5)
            .map((r: any) => [r.nom, r.artiste].filter(Boolean).join(" — "))
            .filter(Boolean)
            .join(" | ")
          if (names) line += ` [résultats affichés : ${names}]`
        }
        return line
      }).join("\n")

      const userMsg = `Historique :\n${convSummary || "(première recherche)"}\n\nNouveau message : "${currentMessage}"${hasImage ? " [image jointe]" : ""}`

      console.log(`[GROQ:plan] ▶ Appel LLM — ${conversation.length} msgs contexte`)

      try {
        const raw = await callGroq(SYSTEM_PLAN, userMsg, 120, 0.1)
        console.log(`[GROQ:plan] ✅ Réponse brute: ${raw}`)
        const cleaned = (raw || "{}").replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(cleaned)
        const result = {
          query: String(parsed.query || currentMessage).trim(),
          top_k: Math.min(Math.max(parseInt(String(parsed.top_k)) || 3, 1), 12),
        }
        console.log(`[GROQ:plan] ✅ Décision: query="${result.query}" | top_k=${result.top_k}`)
        return NextResponse.json(result)
      } catch (e) {
        console.warn("[GROQ:plan] ❌ Parse échoué, fallback:", e)
        return NextResponse.json({ query: currentMessage, top_k: 3 })
      }
    }

    // ── MODE DESCRIBE ──
    const { query, searchContext, results, hasImage } = body
    console.log(`[GROQ:describe] ▶ Appel LLM — query="${query}" | ${results?.length} résultats | image=${hasImage}`)

    const resultLines = (results || [])
      .map((r: any, i: number) => {
        const parts = [r.nom, r.artiste, r.annee, r.dimensions].filter(Boolean)
        return `${i + 1}. ${parts.join(" — ")}`
      })
      .join("\n")

    const userMsg = `Demande client : "${query}"${hasImage ? " [avec image jointe]" : ""}
Contexte : "${searchContext}"
Luminaires sélectionnés par notre moteur :
${resultLines || "Résultats disponibles"}

Présente ces luminaires.`

    try {
      const message = await callGroq(SYSTEM_DESCRIBE, userMsg, 150, 0.7)
      console.log(`[GROQ:describe] ✅ "${message?.slice(0, 100)}..."`)
      return NextResponse.json({ message })
    } catch (e) {
      console.warn("[GROQ:describe] ❌ Erreur:", e)
      return NextResponse.json({ message: null })
    }

  } catch (error: any) {
    console.error("[GROQ] ❌ Erreur route:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
