"use client"

import { useCallback, useRef, useState } from "react"
import { DEFAULT_WORDS } from "../data"

// Bundle navigateur officiel du SDK Azure Speech, chargé à la demande via une
// balise <script> plutôt qu'un import npm — évite de toucher au package.json
// racine du site (hors du périmètre de cette page) et ne charge ce SDK
// (volumineux) que pour les visiteurs qui utilisent réellement le micro sur
// /admin/english-coach. URL officielle référencée par les échantillons
// Azure-Samples/cognitive-services-speech-sdk (quickstart navigateur) :
// https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/quickstart/javascript/browser/from-microphone/index.html
const SPEECH_SDK_SCRIPT_URL = "https://aka.ms/csspeech/jsbrowserpackageraw"

// Route serveur (sous /admin/english-coach, voir api/speech-token/route.ts)
// qui échange AZURE_SPEECH_KEY contre un jeton d'autorisation de courte durée
// (10 min) — le SDK tournant dans le navigateur ne doit jamais recevoir la
// clé d'abonnement directement.
const TOKEN_ENDPOINT = "/admin/english-coach/api/speech-token"

// Poids de biaisage de la Phrase List Azure (échelle documentée : 0.0 la
// désactive, 1.0 = poids par défaut, 2.0 = poids maximal). On choisit 1.5 —
// un biais fort vers le vocabulaire technique du projet (wallwasher,
// downlight, flickering, DALI...) sans aller jusqu'au poids maximal, qui
// risquerait de pénaliser la reconnaissance des phrases "normales" autour de
// ce vocabulaire (salutations, tournures générales) qui ne font pas partie
// de la liste. Voir https://learn.microsoft.com/azure/ai-services/speech-service/improve-accuracy-phrase-list
const PHRASE_LIST_WEIGHT = 1.5

// Durée max pendant laquelle une instance pré-chauffée (micro + jeton + SDK
// prêts) reste ouverte sans être récupérée par startListening() — évite de
// garder le micro actif indéfiniment si l'utilisateur n'utilise finalement
// jamais le micro sur cet écran.
const WARM_MAX_IDLE_MS = 60000

// Charge le SDK une seule fois par page (le script s'ajoute au <head> et
// expose window.SpeechSDK) ; les appels suivants réutilisent la même promesse
// même si plusieurs composants (Flashcard/Roleplay/Appel) appellent le hook
// indépendamment.
let sdkLoadPromise: Promise<any> | null = null
function loadSpeechSDK(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  const w = window as any
  if (w.SpeechSDK) return Promise.resolve(w.SpeechSDK)
  if (sdkLoadPromise) return sdkLoadPromise
  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SPEECH_SDK_SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (w.SpeechSDK) resolve(w.SpeechSDK)
      else reject(new Error("SpeechSDK introuvable après chargement du script"))
    }
    script.onerror = () => reject(new Error("échec du chargement du script Azure Speech SDK"))
    document.head.appendChild(script)
  })
  return sdkLoadPromise
}

// Construit la liste de phrases à partir du champ `en` de TOUT le vocabulaire
// du projet (data.ts, ~390 mots/phrases). Certaines entrées combinent deux
// variantes séparées par " / " (ex: "Driver / Transformer") — on les éclate
// en deux phrases distinctes, chacune utile individuellement à la
// reconnaissance, plutôt que de biaiser vers la chaîne littérale complète
// avec le slash (jamais prononcée telle quelle). Les slashs collés sans
// espace (ex: "narrow/wide") restent intacts, ce sont de vraies parenthèses
// de contenu. Calculé une seule fois au chargement du module. Azure plafonne
// une phrase list à 500 entrées (doc officielle) ; le résultat réel
// (~400 après dédoublonnage) reste largement en dessous.
const PHRASE_LIST_CANDIDATES: string[] = (() => {
  const seen = new Set<string>()
  const phrases: string[] = []
  for (const w of DEFAULT_WORDS) {
    for (const part of w.en.split(/\s+\/\s+/)) {
      const phrase = part.trim()
      if (phrase && !seen.has(phrase.toLowerCase())) {
        seen.add(phrase.toLowerCase())
        phrases.push(phrase)
      }
    }
  }
  return phrases.slice(0, 500)
})()

interface AzureToken {
  token: string
  region: string
}

async function fetchAzureToken(): Promise<AzureToken> {
  const res = await fetch(TOKEN_ENDPOINT, { cache: "no-store" })
  if (!res.ok) throw new Error(`jeton Azure — HTTP ${res.status}`)
  const data = await res.json()
  if (!data?.token || !data?.region) throw new Error("réponse de jeton Azure invalide")
  return { token: data.token, region: data.region }
}

// Instance "en attente" créée par prewarm() : micro négocié (getUserMedia
// déjà résolu — c'est le moment précis où le voyant micro du navigateur
// s'allume), jeton Azure récupéré, SDK chargé — mais aucune reconnaissance
// n'est encore lancée dessus. startListening() récupère ces trois éléments
// tels quels plutôt que de repartir de zéro, ce qui évite de repayer leur
// latence cumulée (permission micro, aller-retour réseau du jeton, poids du
// SDK) au moment précis où les tout premiers mots de l'utilisateur risquent
// d'être perdus.
interface WarmEntry {
  stream: MediaStream
  token: AzureToken
  sdk: any
  consumed: boolean
  idleTimer: ReturnType<typeof setTimeout> | null
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognizerRef = useRef<any>(null)
  const activeStreamRef = useRef<MediaStream | null>(null)
  const warmRef = useRef<WarmEntry | null>(null)

  const supported = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia

  // prewarm() réchauffe les trois ingrédients d'une écoute Azure — micro,
  // jeton, SDK — dès l'affichage de l'écran de réponse (ou dès le début de la
  // question en appel téléphonique), avant que l'utilisateur ait la moindre
  // intention de parler. Sans ça, le tout premier démarrage d'une interaction
  // paie leur latence cumulée pendant laquelle les premiers mots prononcés
  // juste après le clic peuvent être perdus.
  const prewarm = useCallback(() => {
    if (warmRef.current || recognizerRef.current) return // déjà chaud ou déjà en écoute réelle
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return
    ;(async () => {
      let stream: MediaStream | null = null
      try {
        const [sdk, micStream, token] = await Promise.all([
          loadSpeechSDK(),
          navigator.mediaDevices.getUserMedia({ audio: true }),
          fetchAzureToken(),
        ])
        stream = micStream
        // Une écoute réelle a pu démarrer (ou un autre préchauffage aboutir)
        // pendant ces await : ce préchauffage est alors obsolète, on libère
        // le micro qu'on vient d'ouvrir sans l'installer.
        if (warmRef.current || recognizerRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const entry: WarmEntry = { stream, token, sdk, consumed: false, idleTimer: null }
        warmRef.current = entry
        setMicReady(true)
        console.log("[speech] 🔥 prewarm() Azure — micro + jeton + SDK prêts")
        entry.idleTimer = setTimeout(() => {
          if (warmRef.current === entry && !entry.consumed) {
            console.log("[speech] 🔥 pré-chauffage jamais utilisé — libération du micro après inactivité")
            stream?.getTracks().forEach((t) => t.stop())
            warmRef.current = null
            setMicReady(false)
          }
        }, WARM_MAX_IDLE_MS)
      } catch (e) {
        console.warn("[speech] ⚠ prewarm() Azure impossible —", e)
        stream?.getTracks().forEach((t) => t.stop())
      }
    })()
  }, [])

  // Démarre une reconnaissance Azure réelle (sdk/stream/token déjà en main,
  // pré-chauffés ou tout juste acquis) avec la Phrase List de vocabulaire
  // technique attachée, en mode "un seul résultat final" (recognizeOnceAsync)
  // — le service Azure gère lui-même le début et la fin de l'utterance,
  // comme le faisait le VAD natif du navigateur avant cette migration.
  const runRecognition = useCallback(
    (sdk: any, stream: MediaStream, token: AzureToken, onResult: (t: string) => void, onNoResult: (() => void) | undefined) => {
      setError(null)
      setListening(true)
      setMicReady(true) // le stream est déjà actif (pré-chauffé ou tout juste acquis)

      let finished = false
      let recognizer: any
      const cleanup = () => {
        if (finished) return
        finished = true
        setListening(false)
        setMicReady(false)
        recognizerRef.current = null
        activeStreamRef.current = null
        try {
          recognizer?.close()
        } catch (e) {
          // no-op
        }
        // Idempotent : si stopListening() a déjà coupé ces pistes entre-temps
        // (arrêt manuel pendant une reconnaissance en cours), les re-stopper
        // ici ne fait rien de plus.
        stream.getTracks().forEach((t) => t.stop())
      }

      try {
        const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token.token, token.region)
        speechConfig.speechRecognitionLanguage = "en-US"
        const audioConfig = sdk.AudioConfig.fromStreamInput(stream)
        recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)

        const phraseList = sdk.PhraseListGrammar.fromRecognizer(recognizer)
        phraseList.addPhrases(PHRASE_LIST_CANDIDATES)
        phraseList.setWeight(PHRASE_LIST_WEIGHT)
        console.log(`[speech] 📋 Phrase List Azure attachée — ${PHRASE_LIST_CANDIDATES.length} termes, poids=${PHRASE_LIST_WEIGHT}`)

        recognizerRef.current = recognizer
        activeStreamRef.current = stream

        recognizer.recognizeOnceAsync(
          (result: any) => {
            const text = String(result?.text || "").trim()
            console.log(`[speech] 📝 Azure — reason=${result?.reason} texte="${text}"`)
            const recognizedSpeech = result?.reason === sdk.ResultReason.RecognizedSpeech
            cleanup()
            if (recognizedSpeech && text) {
              onResult(text)
            } else {
              console.warn("[speech] ⚠ Azure — aucun résultat exploitable (NoMatch ou annulé)")
              onNoResult?.()
            }
          },
          (err: any) => {
            console.error("[speech] ❌ Azure recognizeOnceAsync erreur —", err)
            cleanup()
            setError(`Micro ou service vocal indisponible (${err}) — utilise le clavier vocal de ton téléphone à la place.`)
          },
        )
      } catch (e) {
        console.error("[speech] ❌ Exception synchrone init Azure —", e)
        setListening(false)
        setMicReady(false)
        setError("Micro ou service vocal indisponible ici — utilise le clavier vocal de ton téléphone.")
        stream.getTracks().forEach((t) => t.stop())
      }
    },
    [],
  )

  // startListening(onResult, onNoResult) n'utilise QUE le SDK Azure Speech
  // (dictée) — jamais en parallèle de getUserMedia/MediaRecorder utilisé par
  // ailleurs sur la page. Les deux flux micro (dictée via Azure et
  // enregistrement brut pour la prononciation via useAudioRecorder) ne
  // doivent jamais tourner en même temps : Chrome ne supporte pas de façon
  // fiable deux captures micro actives simultanément (conflit connu). La
  // vérification de prononciation (bouton dédié, voir PronunciationCheck.tsx)
  // fait sa propre capture, strictement séparée dans le temps — startListening
  // et useAudioRecorder.startRecording() ne sont jamais invoqués ensemble
  // par les composants de cette page.
  const startListening = useCallback(
    (onResult: (transcript: string) => void, onNoResult?: () => void) => {
      console.log("[speech] ▶ startListening() appelé (Azure)")

      // Réutilise le micro/jeton/SDK pré-chauffés s'ils existent : rien à
      // réacquérir, on part directement sur recognizeOnceAsync.
      const warm = warmRef.current
      if (warm && !warm.consumed) {
        warm.consumed = true
        if (warm.idleTimer) clearTimeout(warm.idleTimer)
        warmRef.current = null
        console.log("[speech] ♻️ réutilisation micro+jeton+SDK pré-chauffés")
        runRecognition(warm.sdk, warm.stream, warm.token, onResult, onNoResult)
        return
      }

      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Micro non supporté ici — utilise le clavier vocal de ton téléphone directement dans le champ texte.")
        return
      }

      setError(null)
      ;(async () => {
        try {
          const [sdk, stream, token] = await Promise.all([
            loadSpeechSDK(),
            navigator.mediaDevices.getUserMedia({ audio: true }),
            fetchAzureToken(),
          ])
          runRecognition(sdk, stream, token, onResult, onNoResult)
        } catch (e) {
          console.error("[speech] ❌ Échec initialisation Azure (cold start) —", e)
          setError("Micro ou service vocal indisponible — utilise le clavier vocal de ton téléphone à la place.")
          setListening(false)
        }
      })()
    },
    [runRecognition],
  )

  const stopListening = useCallback(() => {
    // Coupe aussi une éventuelle instance pré-chauffée jamais consommée (ex :
    // l'utilisateur quitte l'écran avant d'avoir parlé) pour libérer le micro.
    if (warmRef.current && !warmRef.current.consumed) {
      if (warmRef.current.idleTimer) clearTimeout(warmRef.current.idleTimer)
      warmRef.current.stream.getTracks().forEach((t) => t.stop())
      warmRef.current = null
    }
    if (recognizerRef.current) {
      try {
        recognizerRef.current.close()
      } catch (e) {
        // no-op
      }
      recognizerRef.current = null
    }
    // Coupe directement les pistes micro de la reconnaissance en cours, sans
    // dépendre du callback recognizeOnceAsync pour le faire : close() peut
    // interrompre la reconnaissance sans jamais rappeler ni le callback de
    // succès ni celui d'erreur, ce qui laisserait le micro allumé sinon.
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop())
      activeStreamRef.current = null
    }
    setListening(false)
    setMicReady(false)
  }, [])

  return { listening, micReady, error, supported, startListening, stopListening, prewarm }
}

// Synthèse vocale via Azure Neural TTS (route serveur /api/tts) — remplace
// l'ancien speechSynthesis du navigateur, dont la voix par défaut variait d'un
// appareil à l'autre et ne permettait pas de choisir un accent par personnage.
// Un seul <audio> partagé pour toute la page : un nouvel appel à speak() doit
// toujours couper court à la réplique précédente, jamais les superposer.
let sharedAudio: HTMLAudioElement | null = null
let sharedObjectUrl: string | null = null

function stopSharedAudio() {
  if (sharedAudio) {
    sharedAudio.onended = null
    sharedAudio.onerror = null
    sharedAudio.pause()
    sharedAudio = null
  }
  if (sharedObjectUrl) {
    URL.revokeObjectURL(sharedObjectUrl)
    sharedObjectUrl = null
  }
}

const MSE_MIME = "audio/mpeg"

function canStreamViaMSE(): boolean {
  return (
    typeof window !== "undefined" &&
    "MediaSource" in window &&
    typeof MediaSource.isTypeSupported === "function" &&
    MediaSource.isTypeSupported(MSE_MIME)
  )
}

// Lit un flux MP3 en streaming via MediaSource Extensions : chaque chunk reçu
// du réseau est ajouté au SourceBuffer au fur et à mesure, et la lecture
// démarre dès le premier chunk plutôt que d'attendre le fichier complet.
// perfMark (performance.now() pris avant l'appel /api/coach côté composant)
// sert uniquement à logguer la latence bout-en-bout perçue par l'utilisateur.
async function playStreaming(
  body: ReadableStream<Uint8Array>,
  fetchStart: number,
  perfMark: number | undefined,
  finish: (label: string) => void,
  onEnd: (() => void) | undefined,
  text: string,
): Promise<void> {
  const mediaSource = new MediaSource()
  const objectUrl = URL.createObjectURL(mediaSource)
  const audio = new Audio(objectUrl)
  sharedAudio = audio
  sharedObjectUrl = objectUrl

  await new Promise<void>((resolveOpen) => {
    mediaSource.addEventListener("sourceopen", () => resolveOpen(), { once: true })
  })

  const sourceBuffer = mediaSource.addSourceBuffer(MSE_MIME)
  const reader = body.getReader()

  const appendChunk = (chunk: Uint8Array) =>
    new Promise<void>((resolve, reject) => {
      const onUpdateEnd = () => {
        sourceBuffer.removeEventListener("updateend", onUpdateEnd)
        resolve()
      }
      sourceBuffer.addEventListener("updateend", onUpdateEnd)
      try {
        sourceBuffer.appendBuffer(chunk)
      } catch (e) {
        reject(e)
      }
    })

  let playStarted = false
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    await appendChunk(value)
    if (!playStarted) {
      playStarted = true
      const ttfa = Math.round(performance.now() - fetchStart)
      console.log(`[speech] ⏱ premier chunk audio jouable après ${ttfa}ms (réseau + génération Azure)`)
      if (perfMark !== undefined) {
        console.log(`[speech] ⏱ latence totale (soumission réponse -> début de la voix) : ${Math.round(performance.now() - perfMark)}ms`)
      }
      await audio.play()
    }
  }
  if (mediaSource.readyState === "open") {
    try {
      mediaSource.endOfStream()
    } catch (e) {
      // no-op — peut arriver si le flux a déjà fini/erroré entre-temps
    }
  }

  if (onEnd) {
    audio.onended = () => finish("ended")
    audio.onerror = (e: any) => {
      console.error("[speech] ❌ lecture audio Azure (streaming) —", e)
      finish("error")
    }
    const estimatedMs = Math.max(4000, text.length * 90)
    setTimeout(() => {
      if (playStarted) return // laissé à onended/onerror une fois la lecture démarrée
      console.warn("[speech] ⏱ Timeout de secours — lecture jamais démarrée")
      finish("timeout")
    }, estimatedMs)
  }
}

// Fallback pour les navigateurs sans support MSE/mp3 (ex: anciens Safari) :
// téléchargement complet puis lecture, comme avant la migration streaming.
async function playBuffered(
  res: Response,
  fetchStart: number,
  perfMark: number | undefined,
  finish: (label: string) => void,
  onEnd: (() => void) | undefined,
  text: string,
): Promise<void> {
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  sharedObjectUrl = url
  const audio = new Audio(url)
  sharedAudio = audio

  console.log(`[speech] ⏱ audio complet téléchargé après ${Math.round(performance.now() - fetchStart)}ms (pas de MSE — fallback)`)
  if (perfMark !== undefined) {
    console.log(`[speech] ⏱ latence totale (soumission réponse -> début de la voix) : ${Math.round(performance.now() - perfMark)}ms`)
  }

  if (onEnd) {
    audio.onended = () => finish("ended")
    audio.onerror = (e: any) => {
      console.error("[speech] ❌ lecture audio Azure —", e)
      finish("error")
    }
    const estimatedMs = Math.max(4000, text.length * 90)
    setTimeout(() => {
      finish("timeout")
    }, estimatedMs)
  }

  await audio.play()
}

// onEnd est appelé une fois la lecture audio terminée — utilisé pour enchaîner
// automatiquement sur l'écoute du micro (mode appel téléphonique). perfMark
// (optionnel) est un performance.now() pris juste avant l'appel /api/coach côté
// composant, uniquement pour logguer la latence bout-en-bout mesurée.
export async function speak(text: string, voice: string, onEnd?: () => void, perfMark?: number): Promise<void> {
  console.log(`[speech] 🗣 speak() (Azure TTS) appelé — voice=${voice} — "${text}"`)
  stopSharedAudio()

  if (typeof window === "undefined") {
    onEnd?.()
    return
  }

  let ended = false
  const finish = (label: string) => {
    if (ended) return
    ended = true
    console.log(`[speech] ⏹ lecture Azure terminée (${label})`)
    onEnd?.()
  }

  const fetchStart = performance.now()
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    if (res.body && canStreamViaMSE()) {
      await playStreaming(res.body, fetchStart, perfMark, finish, onEnd, text)
    } else {
      await playBuffered(res, fetchStart, perfMark, finish, onEnd, text)
    }
  } catch (e) {
    console.error("[speech] ❌ Erreur speak() Azure —", e)
    finish("exception")
  }
}

export function cancelSpeech() {
  stopSharedAudio()
}
