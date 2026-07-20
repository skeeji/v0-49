import { type NextRequest, NextResponse } from "next/server"
import type {
  CoachRequest,
  FlashcardCoachResponse,
  RoleplayCoachResponse,
  PhoneCallCoachResponse,
} from "@/app/admin/english-coach/types"

// Clé API détenue uniquement côté serveur — jamais exposée au client.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const ANTHROPIC_MODEL = "claude-sonnet-5"

const PERSONA = `Tu es un coach d'anglais professionnel spécialisé en éclairage retail de luxe et commissioning DALI. L'utilisateur est un expert technique français, niveau anglais débutant (6ème), qui doit être opérationnel à l'oral dans un mois à Dubaï. Sois exigeant mais bienveillant.`

const PHONETIC_NOTE = `Note sur la transcription vocale : la réponse de l'utilisateur peut provenir d'une reconnaissance vocale imparfaite sur du vocabulaire technique (elle peut transcrire un mot proche phonétiquement mais orthographié ou choisi différemment, ex: "downlights" transcrit en "done like"). Si la réponse transcrite est phonétiquement proche du terme ou de la formulation attendue, considère-la comme correcte et signale la possible erreur de transcription dans ton feedback plutôt que de compter ça comme une faute de l'utilisateur.`

const SYSTEM_PROMPT_FLASHCARD = `${PERSONA}

Évalue sa réponse sur le FOND (serait-elle comprise et jugée professionnelle par un anglophone natif sur un chantier ou en boutique de luxe), pas sur la présence exacte de mots-clés. Varie systématiquement tes phrases d'exemple et tes relances — ne répète jamais la même formulation deux fois de suite.

${PHONETIC_NOTE}

Contrainte de longueur : feedback_fr doit faire 1 à 2 phrases maximum, jamais plus.

Réponds UNIQUEMENT en JSON strict, format :
{
  "correct": boolean,
  "score": 0-5,
  "feedback_fr": "explication courte et actionnable en français",
  "better_phrasing_en": "la formulation professionnelle correcte",
  "follow_up_en": "une nouvelle question ou relance en anglais, différente de la précédente"
}`

const SYSTEM_PROMPT_ROLEPLAY = `${PERSONA}

Tu évalues un tour de jeu de rôle (roleplay) dans un contexte professionnel donné. Il n'y a PAS de phrase-cible unique attendue : plusieurs réponses différentes peuvent être également valables à l'oral. Évalue la COHÉRENCE et la PERTINENCE PROFESSIONNELLE de la réponse dans le contexte donné, pas sa correspondance à une phrase précise.

${PHONETIC_NOTE}

Contrainte de longueur : suggestion_fr doit faire 1 à 2 phrases maximum, jamais plus.

Varie systématiquement tes questions de suivi (next_question_en) — pioche parmi plusieurs formulations possibles pour chaque situation, ne répète jamais la question précédente ni une question déjà posée dans l'historique fourni, afin que deux sessions ne se ressemblent jamais.

IMPORTANT : next_question_en est un champ OBLIGATOIRE et ne doit JAMAIS être vide, quelle que soit la réponse de l'utilisateur — la conversation doit toujours continuer.

Réponds UNIQUEMENT en JSON strict, format :
{
  "coherent": boolean,
  "suggestion_fr": "string ou null — si coherent=true, laisse null ; si coherent=false, explique en français, très court, comment mieux répondre",
  "next_question_en": "la prochaine réplique du personnage en anglais, dans la continuité du contexte, jamais identique à une question précédente, jamais vide"
}

Exemple :
{"coherent": true, "suggestion_fr": null, "next_question_en": "Great, and what about the dimming curve, did you set it to logarithmic?"}`

const SYSTEM_PROMPT_PHONE_CALL = `${PERSONA}

Tu gères un appel téléphonique 100% oral et continu avec l'utilisateur, dans le contexte professionnel donné. Le personnage pose des questions à l'oral et tu évalues la compréhensibilité de chaque réponse.

${PHONETIC_NOTE}

Contrainte de longueur : correction_fr doit faire 1 à 2 phrases maximum, jamais plus.

Règles :
- understood=true seulement si un anglophone natif comprendrait la réponse sans effort.
- needs_repeat=true UNIQUEMENT si la transcription est trop confuse ou incomplète pour être évaluée (probable souci de micro/son) — PAS si la réponse est simplement fausse ou maladroite.
- correction_fr : si erreur mineure (grammaire, mot technique faux) mais compréhensible, explique très brièvement en français comment corriger ; sinon null.
- Si needs_repeat=true : next_question_en doit être une reformulation variée et naturelle de "Sorry, could you say that again?" (jamais deux fois la même formulation de relance).
- Si needs_repeat=false : next_question_en est la prochaine question normale de la conversation, jamais identique à la question précédente ni à une question déjà posée dans l'historique fourni.

IMPORTANT : next_question_en est un champ OBLIGATOIRE et ne doit JAMAIS être vide — l'appel téléphonique doit toujours continuer, quelle que soit la réponse de l'utilisateur.

Réponds UNIQUEMENT en JSON strict, format :
{
  "understood": boolean,
  "needs_repeat": boolean,
  "correction_fr": "string ou null",
  "next_question_en": "string, jamais vide"
}

Exemple :
{"understood": true, "needs_repeat": false, "correction_fr": null, "next_question_en": "Alright, and how long will the commissioning take, roughly?"}`

function fallbackFlashcard(targetPhrase: string): FlashcardCoachResponse {
  return {
    correct: false,
    score: 0,
    feedback_fr: "Le coach n'a pas pu analyser ta réponse cette fois-ci, réessaie.",
    better_phrasing_en: targetPhrase,
    follow_up_en: "Can you try answering again?",
  }
}

function fallbackRoleplay(): RoleplayCoachResponse {
  return {
    coherent: false,
    suggestion_fr: "Le coach n'a pas pu analyser ta réponse cette fois-ci, réessaie.",
    next_question_en: "Can you try again?",
  }
}

function fallbackPhoneCall(): PhoneCallCoachResponse {
  return {
    understood: false,
    needs_repeat: true,
    correction_fr: null,
    next_question_en: "Sorry, could you say that again?",
  }
}

function extractJSON(raw: string): any {
  const cleaned = raw.replace(/```json|```/g, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw new Error("Aucun objet JSON exploitable dans la réponse du modèle")
  }
}

async function callAnthropicRaw(systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API ${res.status} ${res.statusText}: ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || "{}"
}

// Appelle Claude et parse le JSON, avec un retry unique en cas d'échec (appel réseau ou parsing).
async function callCoachAI<T>(
  mode: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  buildResult: (parsed: any) => T,
): Promise<T | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callAnthropicRaw(systemPrompt, userMessage, maxTokens)
      console.log(`[coach:${mode}] ✅ Réponse brute (essai ${attempt}/2):`, raw)
      const parsed = extractJSON(raw)
      return buildResult(parsed)
    } catch (error: any) {
      console.error(
        `[coach:${mode}] ❌ Échec essai ${attempt}/2 — ${error?.message || error}`,
        error?.stack ? `\n${error.stack}` : "",
      )
      if (attempt === 2) return null
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    console.error("[coach] ❌ ANTHROPIC_API_KEY manquante — configure cette variable d'environnement côté serveur")
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  try {
    const body = (await request.json()) as Partial<CoachRequest>
    const mode: CoachRequest["mode"] =
      body.mode === "roleplay" ? "roleplay" : body.mode === "phone_call" ? "phone_call" : "flashcard"
    const targetPhrase = String(body.targetPhrase || "")
    const userAnswer = String(body.userAnswer || "")
    const context = String(body.context || "")
    const history = Array.isArray(body.history) ? body.history.slice(0, 10) : []

    if (!userAnswer.trim()) {
      return NextResponse.json({ error: "userAnswer requis" }, { status: 400 })
    }

    const historyLine = history.length
      ? `Questions/mots déjà utilisés récemment (ne les répète pas, adapte la difficulté) : ${history.join(", ")}`
      : ""

    console.log(`[coach] ▶ mode=${mode} target="${targetPhrase}" answer="${userAnswer}"`)

    if (mode === "roleplay") {
      const userMessage = `Contexte du roleplay : ${context}
Dernière réplique du personnage : "${targetPhrase}"
Réponse de l'utilisateur : "${userAnswer}"
${historyLine}`

      const result = await callCoachAI<RoleplayCoachResponse>(
        "roleplay",
        SYSTEM_PROMPT_ROLEPLAY,
        userMessage,
        550,
        (parsed) => {
          const next_question_en = String(parsed.next_question_en || "").trim()
          if (!next_question_en) throw new Error("next_question_en vide dans la réponse du modèle")
          return {
            coherent: Boolean(parsed.coherent),
            suggestion_fr: parsed.coherent ? null : String(parsed.suggestion_fr || ""),
            next_question_en,
          }
        },
      )
      return NextResponse.json(result ?? fallbackRoleplay())
    }

    if (mode === "phone_call") {
      const userMessage = `Contexte de l'appel : ${context}
Dernière question posée à l'oral : "${targetPhrase}"
Transcription de la réponse de l'utilisateur : "${userAnswer}"
${historyLine}`

      const result = await callCoachAI<PhoneCallCoachResponse>(
        "phone_call",
        SYSTEM_PROMPT_PHONE_CALL,
        userMessage,
        550,
        (parsed) => {
          const next_question_en = String(parsed.next_question_en || "").trim()
          if (!next_question_en) throw new Error("next_question_en vide dans la réponse du modèle")
          return {
            understood: Boolean(parsed.understood),
            needs_repeat: Boolean(parsed.needs_repeat),
            correction_fr: parsed.correction_fr ? String(parsed.correction_fr) : null,
            next_question_en,
          }
        },
      )
      return NextResponse.json(result ?? fallbackPhoneCall())
    }

    // mode === "flashcard"
    const userMessage = `Contexte : ${context}
Phrase/mot attendu en anglais : "${targetPhrase}"
Réponse de l'utilisateur : "${userAnswer}"
${history.length ? `Mots récemment ratés (adapte la difficulté) : ${history.join(", ")}` : ""}`

    const result = await callCoachAI<FlashcardCoachResponse>(
      "flashcard",
      SYSTEM_PROMPT_FLASHCARD,
      userMessage,
      300,
      (parsed) => ({
        correct: Boolean(parsed.correct),
        score: Math.min(Math.max(Number(parsed.score) || 0, 0), 5),
        feedback_fr: String(parsed.feedback_fr || ""),
        better_phrasing_en: String(parsed.better_phrasing_en || targetPhrase),
        follow_up_en: String(parsed.follow_up_en || ""),
      }),
    )
    return NextResponse.json(result ?? fallbackFlashcard(targetPhrase))
  } catch (error: any) {
    console.error("[coach] ❌ Erreur route inattendue:", error?.message || error, error?.stack ? `\n${error.stack}` : "")
    return NextResponse.json(fallbackFlashcard(""), { status: 200 })
  }
}
