import { type NextRequest, NextResponse } from "next/server"

// Clés détenues uniquement côté serveur — jamais exposées au client.
// AZURE_SPEECH_REGION peut contenir des espaces parasites selon la façon dont la
// variable a été saisie dans l'environnement (ex: Coolify/.env) ; on trim pour
// éviter un hostname invalide du type "https:// northeurope.tts...".
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY?.trim()
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION?.trim()

const OUTPUT_FORMAT = "audio-24khz-96kbitrate-mono-mp3"

function escapeSSML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// La locale SSML doit correspondre à celle de la voix (ex: "en-IN" pour
// "en-IN-PrabhatNeural") pour une prosodie correcte — on la dérive du nom de
// voix plutôt que de la coder en dur, vu que 3 accents différents sont utilisés
// selon le personnage (électricien, manager, douanier).
function localeFromVoice(voice: string): string {
  const parts = voice.split("-")
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : "en-US"
}

export async function POST(request: NextRequest) {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    console.error("[tts] ❌ AZURE_SPEECH_KEY/AZURE_SPEECH_REGION manquantes")
    return NextResponse.json({ error: "Azure Speech not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const text = String(body.text || "").trim()
    const voice = String(body.voice || "").trim()

    if (!text || !voice) {
      return NextResponse.json({ error: "text et voice requis" }, { status: 400 })
    }

    const locale = localeFromVoice(voice)
    const ssml = `<speak version='1.0' xml:lang='${locale}'><voice name='${voice}'><prosody rate='0.92'>${escapeSSML(text)}</prosody></voice></speak>`

    const url = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
        "User-Agent": "dubai-coach-english",
      },
      body: ssml,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[tts] ❌ Azure Speech ${res.status}: ${err}`)
      return NextResponse.json({ error: "Azure Speech API error" }, { status: 502 })
    }

    const audioBuffer = await res.arrayBuffer()
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("[tts] ❌ Erreur route:", error?.message || error, error?.stack ? `\n${error.stack}` : "")
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
