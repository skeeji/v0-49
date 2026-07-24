import { NextResponse } from "next/server"

// Clé détenue uniquement côté serveur — jamais exposée au client. Le SDK Azure
// Speech tournant dans le navigateur (dictée avec PhraseListGrammar) ne peut
// pas embarquer AZURE_SPEECH_KEY directement : cette route lui fournit à la
// place un jeton d'autorisation de courte durée (10 minutes, standard Azure
// Cognitive Services), consommé via SpeechConfig.fromAuthorizationToken côté
// client. Route volontairement placée sous /admin/english-coach/api (plutôt
// que /api) pour rester dans le périmètre de la page english-coach.
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY?.trim()
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION?.trim()
// Endpoint personnalisé de la ressource (Portail Azure -> ressource Speech ->
// "Clés et points de terminaison" -> "Endpoint"), optionnel. Certaines
// ressources (notamment les ressources "multi-service"/IA récentes) rejettent
// l'émission de jeton (401) sur l'endpoint régional générique
// {region}.api.cognitive.microsoft.com et exigent cet endpoint dédié — vérifié
// empiriquement sur ce projet. Si absent, on retombe sur l'endpoint régional
// générique (suffisant pour les ressources Speech mono-service classiques).
const AZURE_SPEECH_ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT?.trim().replace(/\/+$/, "")

export async function GET() {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    console.error("[speech-token] ❌ AZURE_SPEECH_KEY/AZURE_SPEECH_REGION manquantes")
    return NextResponse.json({ error: "Azure Speech not configured" }, { status: 500 })
  }

  try {
    const url = AZURE_SPEECH_ENDPOINT
      ? `${AZURE_SPEECH_ENDPOINT}/sts/v1.0/issueToken`
      : `https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": "0",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[speech-token] ❌ Azure STS ${res.status}: ${err}`)
      return NextResponse.json({ error: "Azure Speech token error" }, { status: 502 })
    }

    const token = await res.text()
    return NextResponse.json({ token, region: AZURE_SPEECH_REGION })
  } catch (error: any) {
    console.error("[speech-token] ❌ Erreur route:", error?.message || error, error?.stack ? `\n${error.stack}` : "")
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
