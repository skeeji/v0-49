import { type NextRequest, NextResponse } from "next/server"
import type { PronunciationResult } from "@/app/admin/english-coach/types"

// Clés détenues uniquement côté serveur — jamais exposées au client. Cette route
// n'est appelée que sur clic explicite du bouton "Vérifier ma prononciation"
// (jamais automatiquement) pour rester dans le palier gratuit Azure (5h/mois).
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION

function buildPronunciationAssessmentHeader(referenceText: string): string {
  const config = {
    ReferenceText: referenceText,
    GradingSystem: "HundredMark",
    Granularity: "Phoneme",
    Dimension: "Comprehensive",
  }
  return Buffer.from(JSON.stringify(config)).toString("base64")
}

export async function POST(request: NextRequest) {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    console.error("[pronunciation] ❌ AZURE_SPEECH_KEY/AZURE_SPEECH_REGION manquantes")
    return NextResponse.json({ error: "Azure Speech not configured" }, { status: 500 })
  }

  try {
    const form = await request.formData()
    const audio = form.get("audio")
    const referenceText = String(form.get("referenceText") || "").trim()

    if (!(audio instanceof Blob) || !referenceText) {
      return NextResponse.json({ error: "audio et referenceText requis" }, { status: 400 })
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer())
    const contentType = audio.type || "audio/webm;codecs=opus"

    const url = `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": contentType,
        "Pronunciation-Assessment": buildPronunciationAssessmentHeader(referenceText),
        Accept: "application/json",
      },
      body: audioBuffer,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[pronunciation] ❌ Azure Speech ${res.status}: ${err}`)
      return NextResponse.json({ error: "Azure Speech API error" }, { status: 502 })
    }

    const data = await res.json()
    console.log("[pronunciation] ✅ Réponse Azure —", JSON.stringify(data))

    const best = data?.NBest?.[0]
    if (!best) {
      return NextResponse.json({ error: "No speech recognized" }, { status: 422 })
    }

    const result: PronunciationResult = {
      overall: Math.round(best.PronunciationAssessment?.AccuracyScore ?? 0),
      fluency: Math.round(best.PronunciationAssessment?.FluencyScore ?? 0),
      words: (best.Words || []).map((w: any) => ({
        word: w.Word,
        accuracy: Math.round(w.PronunciationAssessment?.AccuracyScore ?? 0),
      })),
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[pronunciation] ❌ Erreur route:", error?.message || error, error?.stack ? `\n${error.stack}` : "")
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
