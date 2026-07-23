"use client"

import { useCallback, useRef, useState } from "react"

interface MinimalSpeechRecognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

// Délai de silence toléré avant de considérer que l'utilisateur a fini de parler.
// Plus généreux au tout début (temps de démarrer à parler) que pendant les pauses
// naturelles au milieu d'une phrase (utilisateur débutant en anglais qui hésite).
const INITIAL_SILENCE_MS = 8000
const TRAILING_SILENCE_MS = 2200

const AUDIO_CAPTURE_MIME_TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm"]

function pickAudioCaptureMimeType(): string {
  for (const type of AUDIO_CAPTURE_MIME_TYPES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type
  }
  return ""
}

function getSpeechRecognitionCtor(): (new () => MinimalSpeechRecognition) | null {
  if (typeof window === "undefined") return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const micStreamRef = useRef<MediaStream | null>(null)

  const supported = typeof window !== "undefined" && !!getSpeechRecognitionCtor()

  const stopAudioCapture = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === "inactive") {
        resolve(null)
        return
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" })
        micStreamRef.current?.getTracks().forEach((t) => t.stop())
        micStreamRef.current = null
        mediaRecorderRef.current = null
        resolve(blob.size > 0 ? blob : null)
      }
      recorder.stop()
    })
  }, [])

  // startListening(onResult, onNoResult) capture aussi l'audio brut du micro en
  // parallèle de la reconnaissance vocale (deux flux indépendants sur le même
  // micro), pour que le bouton "Vérifier ma prononciation" (Azure) puisse
  // réutiliser cette prise sans redemander à l'utilisateur de reparler.
  //
  // Important : cette capture parallèle est volontairement fire-and-forget (pas
  // de await avant rec.start()). Chrome ne supporte pas de façon fiable un
  // getUserMedia()/MediaRecorder actif en même temps qu'une SpeechRecognition en
  // cours de négociation d'accès au micro (conflit connu, cf. tracker Chromium) :
  // si on attend que ce flux démarre avant de lancer rec.start(), la
  // reconnaissance vocale ne capte plus jamais rien (plus aucun onresult). On
  // lance donc rec.start() sans attendre, quitte à ce que les tout premiers ms
  // d'un mot très court manquent à l'enregistrement parallèle envoyé à Azure
  // Pronunciation Assessment.
  const startListening = useCallback(
    (onResult: (transcript: string, audioBlob: Blob | null) => void, onNoResult?: () => void) => {
    console.log("[speech] ▶ startListening() appelé")
    const SR = getSpeechRecognitionCtor()
    if (!SR) {
      console.error("[speech] ❌ Aucune API SpeechRecognition disponible dans ce navigateur")
      setError("Micro non supporté ici — utilise le clavier vocal de ton téléphone directement dans le champ texte.")
      return
    }

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        micStreamRef.current = stream
        const mimeType = pickAudioCaptureMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        audioChunksRef.current = []
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }
        recorder.start()
        mediaRecorderRef.current = recorder
      })
      .catch((e) => {
        console.warn("[speech] ⚠ Capture audio parallèle indisponible (pronunciation check désactivé pour cette prise) —", e)
      })

    try {
      const rec = new SR()
      rec.lang = "en-US"
      // Mode continu + résultats intermédiaires : on gère nous-mêmes la détection
      // de fin de parole via un timer de silence, plutôt que de dépendre de
      // l'endpointing automatique de Chrome — trop agressif pour un utilisateur
      // qui hésite en anglais (coupait la reconnaissance avant la fin de la
      // phrase, ou l'abandonnait carrément sans résultat).
      rec.continuous = true
      rec.interimResults = true
      rec.maxAlternatives = 1
      setError(null)
      setListening(true)

      let outcome: "result" | "error" | null = null
      let finalTranscript = ""
      let silenceTimer: ReturnType<typeof setTimeout> | null = null

      const clearSilenceTimer = () => {
        if (silenceTimer) {
          clearTimeout(silenceTimer)
          silenceTimer = null
        }
      }
      const scheduleStop = (delayMs: number) => {
        clearSilenceTimer()
        silenceTimer = setTimeout(() => {
          console.log(`[speech] ⏱ Silence de ${delayMs}ms détecté — arrêt de l'écoute`)
          try {
            rec.stop()
          } catch (e) {
            // no-op
          }
        }, delayMs)
      }

      rec.onresult = (event: any) => {
        let interim = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) {
            finalTranscript = (finalTranscript ? finalTranscript + " " : "") + res[0].transcript
            console.log(`[speech] 📝 segment final — "${res[0].transcript}" (cumul="${finalTranscript}")`)
          } else {
            interim += res[0].transcript
          }
        }
        if (interim) console.log(`[speech] ✏️ intermédiaire — "${interim}"`)
        // Tant que ça parle (résultat intermédiaire ou final), on repousse l'arrêt.
        scheduleStop(TRAILING_SILENCE_MS)
      }
      rec.onerror = (event: any) => {
        console.error("[speech] ❌ onerror —", event?.error || event)
        outcome = "error"
        clearSilenceTimer()
        setError(`Micro bloqué ou refusé (${event?.error || "erreur inconnue"}) — utilise le clavier vocal de ton téléphone à la place.`)
        setListening(false)
        stopAudioCapture()
      }
      rec.onend = () => {
        clearSilenceTimer()
        const transcript = finalTranscript.trim()
        console.log(`[speech] ⏹ onend (recognition terminée) — transcript accumulé="${transcript}"`)
        setListening(false)
        stopAudioCapture().then((audioBlob) => {
          if (transcript) {
            outcome = "result"
            onResult(transcript, audioBlob)
          } else if (outcome === null) {
            console.warn("[speech] ⚠ Recognition terminée sans résultat ni erreur (silence non capté)")
            onNoResult?.()
          }
        })
      }
      // Handlers de diagnostic supplémentaires (non standardisés partout mais
      // supportés par Chrome/Edge) — permettent de voir jusqu'où le pipeline
      // audio va réellement : capture micro → détection de son → détection de
      // parole → résultat.
      const r = rec as any
      r.onstart = () => console.log("[speech] 🎙 onstart (recognition démarrée)")
      r.onaudiostart = () => console.log("[speech] 🎚 onaudiostart (capture audio démarrée)")
      r.onsoundstart = () => console.log("[speech] 🔉 onsoundstart (un son a été détecté)")
      r.onspeechstart = () => console.log("[speech] 💬 onspeechstart (de la parole a été détectée)")
      r.onspeechend = () => console.log("[speech] 💬 onspeechend (fin de la parole détectée)")
      r.onsoundend = () => console.log("[speech] 🔉 onsoundend (fin du son détecté)")
      r.onaudioend = () => console.log("[speech] 🎚 onaudioend (fin de la capture audio)")
      r.onnomatch = () => console.warn("[speech] ⚠ onnomatch (son reçu mais non reconnu comme parole)")

      recognitionRef.current = rec
      rec.start()
      console.log("[speech] rec.start() appelé sans exception")
      scheduleStop(INITIAL_SILENCE_MS)
    } catch (e) {
      console.error("[speech] ❌ Exception synchrone sur rec.start() —", e)
      setError("Micro indisponible ici — utilise le clavier vocal de ton téléphone.")
      setListening(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch (e) {
      // no-op
    }
    setListening(false)
    stopAudioCapture()
  }, [stopAudioCapture])

  return { listening, error, supported, startListening, stopListening }
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
