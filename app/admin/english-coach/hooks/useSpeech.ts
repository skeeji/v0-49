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

function getSpeechRecognitionCtor(): (new () => MinimalSpeechRecognition) | null {
  if (typeof window === "undefined") return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null)

  const supported = typeof window !== "undefined" && !!getSpeechRecognitionCtor()

  // startListening(onResult, onNoResult) n'utilise QUE SpeechRecognition — aucune
  // capture getUserMedia/MediaRecorder ici. Les deux flux micro (dictée via
  // SpeechRecognition et enregistrement brut pour la prononciation via
  // useAudioRecorder) ne doivent jamais tourner en même temps : Chrome ne
  // supporte pas de façon fiable un getUserMedia()/MediaRecorder actif en même
  // temps qu'une SpeechRecognition en cours (conflit connu, cf. tracker
  // Chromium) — la reconnaissance vocale ne capte alors plus jamais rien (plus
  // aucun onresult). La vérification de prononciation (bouton dédié, voir
  // PronunciationCheck.tsx) fait sa propre capture, séparée dans le temps.
  const startListening = useCallback((onResult: (transcript: string) => void, onNoResult?: () => void) => {
    console.log("[speech] ▶ startListening() appelé")
    const SR = getSpeechRecognitionCtor()
    if (!SR) {
      console.error("[speech] ❌ Aucune API SpeechRecognition disponible dans ce navigateur")
      setError("Micro non supporté ici — utilise le clavier vocal de ton téléphone directement dans le champ texte.")
      return
    }

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
        // On reconstruit l'intégralité du transcript final à partir de TOUT
        // event.results (indices 0 à length), jamais en n'ajoutant que ce qui
        // se trouve à partir de event.resultIndex. Chrome, en mode continuous,
        // n'a pas un resultIndex fiable d'un onresult à l'autre : il lui arrive
        // de renvoyer à nouveau, comme "final", un segment déjà finalisé lors
        // d'un événement précédent. En accumulant (finalTranscript + res[0].transcript)
        // à chaque onresult au lieu de reconstruire depuis la liste complète,
        // ce segment déjà présent se retrouvait dupliqué/concaténé plusieurs
        // fois — c'était la cause du texte répété ("check check the check the
        // connection..."). En reconstruisant systématiquement l'intégralité du
        // texte final à partir des segments isFinal actuellement présents dans
        // event.results, un même segment ne peut plus jamais être compté deux fois.
        let finalText = ""
        let interim = ""
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) {
            finalText += (finalText ? " " : "") + res[0].transcript
          } else {
            // Résultat provisoire : remplace le précédent, jamais additionné.
            interim += res[0].transcript
          }
        }
        finalTranscript = finalText
        console.log(`[speech] 📝 transcript final reconstruit — "${finalTranscript}"`)
        if (interim) console.log(`[speech] ✏️ intermédiaire (affichage seulement, non retenu) — "${interim}"`)
        // Tant que ça parle (résultat intermédiaire ou final), on repousse l'arrêt.
        scheduleStop(TRAILING_SILENCE_MS)
      }
      rec.onerror = (event: any) => {
        console.error("[speech] ❌ onerror —", event?.error || event)
        outcome = "error"
        clearSilenceTimer()
        setError(`Micro bloqué ou refusé (${event?.error || "erreur inconnue"}) — utilise le clavier vocal de ton téléphone à la place.`)
        setListening(false)
      }
      rec.onend = () => {
        clearSilenceTimer()
        const transcript = finalTranscript.trim()
        console.log(`[speech] ⏹ onend (recognition terminée) — transcript accumulé="${transcript}"`)
        setListening(false)
        if (transcript) {
          outcome = "result"
          onResult(transcript)
        } else if (outcome === null) {
          console.warn("[speech] ⚠ Recognition terminée sans résultat ni erreur (silence non capté)")
          onNoResult?.()
        }
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
  }, [])

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
