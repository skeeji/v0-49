import { type NextRequest, NextResponse } from "next/server"
import type { CoachRequest, CoachResponse } from "@/app/admin/english-coach/types"

// Clé API détenue uniquement côté serveur — jamais exposée au client.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const ANTHROPIC_MODEL = "claude-sonnet-5"

const SYSTEM_PROMPT = `Tu es un coach d'anglais professionnel spécialisé en éclairage retail de luxe et commissioning DALI. L'utilisateur est un expert technique français, niveau anglais débutant (6ème), qui doit être opérationnel à l'oral dans un mois à Dubaï.

Évalue sa réponse sur le FOND (serait-elle comprise et jugée professionnelle par un anglophone natif sur un chantier ou en boutique de luxe), pas sur la présence exacte de mots-clés. Sois exigeant mais bienveillant. Varie systématiquement tes phrases d'exemple et tes relances — ne répète jamais la même formulation deux fois de suite.

Réponds UNIQUEMENT en JSON strict, format :
{
  "correct": boolean,
  "score": 0-5,
  "feedback_fr": "explication courte et actionnable en français",
  "better_phrasing_en": "la formulation professionnelle correcte",
  "follow_up_en": "une nouvelle question ou relance en anglais, différente de la précédente"
}`

function fallbackResponse(targetPhrase: string): CoachResponse {
  return {
    correct: false,
    score: 0,
    feedback_fr: "Le coach n'a pas pu analyser ta réponse cette fois-ci, réessaie.",
    better_phrasing_en: targetPhrase,
    follow_up_en: "Can you try answering again?",
  }
}

function parseCoachJSON(raw: string, targetPhrase: string): CoachResponse {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)
    return {
      correct: Boolean(parsed.correct),
      score: Math.min(Math.max(Number(parsed.score) || 0, 0), 5),
      feedback_fr: String(parsed.feedback_fr || ""),
      better_phrasing_en: String(parsed.better_phrasing_en || targetPhrase),
      follow_up_en: String(parsed.follow_up_en || ""),
    }
  } catch (e) {
    console.warn("[coach] ❌ Parse JSON échoué:", e)
    return fallbackResponse(targetPhrase)
  }
}

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    console.error("[coach] ❌ ANTHROPIC_API_KEY manquante")
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  try {
    const body = (await request.json()) as Partial<CoachRequest>
    const mode = body.mode === "roleplay" ? "roleplay" : "flashcard"
    const targetPhrase = String(body.targetPhrase || "")
    const userAnswer = String(body.userAnswer || "")
    const context = String(body.context || "")
    const history = Array.isArray(body.history) ? body.history.slice(0, 10) : []

    if (!userAnswer.trim()) {
      return NextResponse.json({ error: "userAnswer requis" }, { status: 400 })
    }

    const userMessage = `Mode : ${mode}
Contexte : ${context}
Phrase/mot attendu en anglais : "${targetPhrase}"
Réponse de l'utilisateur : "${userAnswer}"
${history.length ? `Mots récemment ratés (adapte la difficulté) : ${history.join(", ")}` : ""}`

    console.log(`[coach] ▶ mode=${mode} target="${targetPhrase}" answer="${userAnswer}"`)

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error(`[coach] ❌ Anthropic ${anthropicRes.status}:`, err)
      return NextResponse.json(fallbackResponse(targetPhrase))
    }

    const data = await anthropicRes.json()
    const raw = data.content?.[0]?.text || "{}"
    console.log("[coach] ✅ Réponse brute:", raw)

    const result = parseCoachJSON(raw, targetPhrase)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[coach] ❌ Erreur route:", error)
    return NextResponse.json(fallbackResponse(""), { status: 200 })
  }
}
