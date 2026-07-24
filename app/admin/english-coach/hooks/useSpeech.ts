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

// Durée max pendant laquelle une instance pré-chauffée reste ouverte sans être
// récupérée par startListening() — évite de garder le micro actif indéfiniment
// si l'utilisateur n'utilise finalement jamais le micro sur cet écran.
const WARM_MAX_IDLE_MS = 60000

function getSpeechRecognitionCtor(): (new () => MinimalSpeechRecognition) | null {
  if (typeof window === "undefined") return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

// Instance "en attente" créée par prewarm() : le moteur de reconnaissance a
// déjà démarré (permission micro négociée, pipeline audio initialisé) avant
// même que l'utilisateur ait commencé à parler, mais aucun handler métier
// n'y est encore branché. startListening() la récupère telle quelle plutôt
// que d'en créer une nouvelle, ce qui évite de repayer la latence de
// démarrage (souvent plusieurs centaines de ms) au moment précis où les tout
// premiers mots de l'utilisateur risquent d'être perdus.
interface WarmEntry {
  rec: MinimalSpeechRecognition
  ready: boolean
  consumed: boolean
  idleTimer: ReturnType<typeof setTimeout> | null
}

function createConfiguredRecognition(SR: new () => MinimalSpeechRecognition): MinimalSpeechRecognition {
  const rec = new SR()
  rec.lang = "en-US"
  // Mode non-continu + un seul résultat final : on laisse le moteur natif du
  // navigateur (VAD/endpointing intégré) décider seul du début et de la fin
  // de l'utterance, comme dans la toute première version de cette page.
  // Un essai avec continuous=true + interimResults=true (accumulation de
  // segments via un timer de silence géré côté app) a été tenté entre-temps
  // pour tolérer les pauses d'un débutant en anglais, mais a dégradé la
  // précision : chaque segment est reconnu par le moteur sur une fenêtre de
  // contexte plus courte que la phrase entière, ce qui a produit des
  // transcriptions plus fragmentaires/moins fiables qu'une reconnaissance
  // "one-shot" sur la phrase complète. Le compromis accepté en repassant en
  // mode natif : le moteur peut couper une phrase avec hésitation trop tôt
  // (filet de sécurité : bouton clavier manuel côté composants).
  rec.continuous = false
  rec.interimResults = false
  rec.maxAlternatives = 1
  return rec
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null)
  const warmRef = useRef<WarmEntry | null>(null)

  const supported = typeof window !== "undefined" && !!getSpeechRecognitionCtor()

  // prewarm() démarre la reconnaissance en avance (dès l'affichage de l'écran
  // d'appel/roleplay, ou dès que le champ de réponse s'ouvre), avant que
  // l'utilisateur ait la moindre intention de parler. Sans ça, le tout premier
  // rec.start() d'une interaction paie une latence de démarrage (négociation
  // du micro + init du pipeline audio) pendant laquelle les premiers mots
  // prononcés juste après le clic ne sont jamais captés — c'est ce qui
  // tronquait le début des phrases ("I am here for work" -> "here for work").
  // micReady ne passe à true qu'à la réception de onaudiostart, c'est-à-dire
  // quand le micro capte réellement de l'audio — pas avant.
  const prewarm = useCallback(() => {
    if (warmRef.current || recognitionRef.current) return // déjà chaud ou déjà en écoute réelle
    const SR = getSpeechRecognitionCtor()
    if (!SR) return
    try {
      const rec = createConfiguredRecognition(SR)
      const entry: WarmEntry = { rec, ready: false, consumed: false, idleTimer: null }
      warmRef.current = entry
      const r = rec as any
      r.onaudiostart = () => {
        console.log("[speech] 🔥 pré-chauffage — micro actif, prêt à capter")
        entry.ready = true
        if (warmRef.current === entry) setMicReady(true)
      }
      r.onerror = (event: any) => {
        console.warn("[speech] ⚠ pré-chauffage interrompu —", event?.error || event)
        if (warmRef.current === entry) {
          if (entry.idleTimer) clearTimeout(entry.idleTimer)
          warmRef.current = null
          setMicReady(false)
        }
      }
      r.onend = () => {
        // Si startListening() ne l'a jamais récupérée (utilisateur reparti
        // avant de parler, écran quitté...), on nettoie proprement.
        if (warmRef.current === entry) {
          if (entry.idleTimer) clearTimeout(entry.idleTimer)
          warmRef.current = null
          setMicReady(false)
        }
      }
      rec.start()
      console.log("[speech] 🔥 prewarm() — démarrage anticipé de la reconnaissance")
      entry.idleTimer = setTimeout(() => {
        if (warmRef.current === entry && !entry.consumed) {
          console.log("[speech] 🔥 pré-chauffage jamais utilisé — extinction du micro après inactivité")
          try {
            rec.stop()
          } catch (e) {
            // no-op
          }
          warmRef.current = null
          setMicReady(false)
        }
      }, WARM_MAX_IDLE_MS)
    } catch (e) {
      console.warn("[speech] ⚠ prewarm() impossible —", e)
      warmRef.current = null
    }
  }, [])

  // startListening(onResult, onNoResult) n'utilise QUE SpeechRecognition — aucune
  // capture getUserMedia/MediaRecorder ici. Les deux flux micro (dictée via
  // SpeechRecognition et enregistrement brut pour la prononciation via
  // useAudioRecorder) ne doivent jamais tourner en même temps : Chrome ne
  // supporte pas de façon fiable un getUserMedia()/MediaRecorder actif en même
  // temps qu'une SpeechRecognition en cours (conflit connu, cf. tracker
  // Chromium) — la reconnaissance vocale ne capte alors plus jamais rien (plus
  // aucun onresult). La vérification de prononciation (bouton dédié, voir
  // PronunciationCheck.tsx) fait sa propre capture, séparée dans le temps.
  const wireUpRealListening = useCallback(
    (
      rec: MinimalSpeechRecognition,
      onResult: (transcript: string) => void,
      onNoResult: (() => void) | undefined,
      alreadyStarted: boolean,
      startedReady: boolean,
    ) => {
      setError(null)
      setListening(true)
      setMicReady(startedReady)

      let outcome: "result" | "error" | null = null
      let finalTranscript = ""

      rec.onresult = (event: any) => {
        // En mode non-continu + interimResults=false, le navigateur ne
        // déclenche onresult qu'une seule fois par écoute, avec un unique
        // résultat final couvrant toute la phrase (event.results[0][0]) —
        // c'est lui qui gère le début et la fin de l'utterance (VAD natif),
        // pas nous. On reconstruit quand même le texte à partir de TOUS les
        // segments isFinal de event.results (plutôt que de coder en dur
        // l'index 0) : ça reste correct dans ce mode (un seul segment) tout
        // en restant immunisé si jamais le navigateur renvoyait plusieurs
        // segments — c'est cette reconstruction complète à chaque onresult
        // (au lieu d'accumuler event.resultIndex en plus de ce qui existait
        // déjà) qui avait corrigé la duplication de mots observée en mode
        // continuous.
        let finalText = ""
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) finalText += (finalText ? " " : "") + res[0].transcript
        }
        finalTranscript = finalText
        console.log(`[speech] 📝 transcript final — "${finalTranscript}"`)
      }
      rec.onerror = (event: any) => {
        console.error("[speech] ❌ onerror —", event?.error || event)
        outcome = "error"
        setError(`Micro bloqué ou refusé (${event?.error || "erreur inconnue"}) — utilise le clavier vocal de ton téléphone à la place.`)
        setListening(false)
        setMicReady(false)
      }
      rec.onend = () => {
        const transcript = finalTranscript.trim()
        console.log(`[speech] ⏹ onend (recognition terminée) — transcript="${transcript}"`)
        setListening(false)
        setMicReady(false)
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
      r.onaudiostart = () => {
        console.log("[speech] 🎚 onaudiostart (capture audio démarrée) — micro prêt")
        setMicReady(true)
      }
      r.onsoundstart = () => console.log("[speech] 🔉 onsoundstart (un son a été détecté)")
      r.onspeechstart = () => console.log("[speech] 💬 onspeechstart (de la parole a été détectée)")
      r.onspeechend = () => console.log("[speech] 💬 onspeechend (fin de la parole détectée)")
      r.onsoundend = () => console.log("[speech] 🔉 onsoundend (fin du son détecté)")
      r.onaudioend = () => console.log("[speech] 🎚 onaudioend (fin de la capture audio)")
      r.onnomatch = () => console.warn("[speech] ⚠ onnomatch (son reçu mais non reconnu comme parole)")

      recognitionRef.current = rec

      if (alreadyStarted) {
        // Instance pré-chauffée : déjà démarrée, ne surtout pas rappeler
        // .start() (lèverait une InvalidStateError côté navigateur).
        console.log("[speech] instance pré-chauffée branchée, pas de nouveau .start()")
        return
      }

      try {
        rec.start()
        console.log("[speech] rec.start() appelé sans exception")
      } catch (e) {
        console.error("[speech] ❌ Exception synchrone sur rec.start() —", e)
        setError("Micro indisponible ici — utilise le clavier vocal de ton téléphone.")
        setListening(false)
        setMicReady(false)
      }
    },
    [],
  )

  const startListening = useCallback(
    (onResult: (transcript: string) => void, onNoResult?: () => void) => {
      console.log("[speech] ▶ startListening() appelé")

      // Réutilise l'instance pré-chauffée si elle existe : elle tourne déjà, on
      // se contente de brancher les vrais handlers dessus (surtout ne pas
      // rappeler .start() sur une reconnaissance déjà démarrée) — c'est ce qui
      // permet au micro d'être déjà actif avant les premiers mots.
      const warm = warmRef.current
      if (warm && !warm.consumed) {
        warm.consumed = true
        if (warm.idleTimer) clearTimeout(warm.idleTimer)
        warmRef.current = null
        console.log(`[speech] ♻️ réutilisation de l'instance pré-chauffée (ready=${warm.ready})`)
        wireUpRealListening(warm.rec, onResult, onNoResult, true, warm.ready)
        return
      }

      const SR = getSpeechRecognitionCtor()
      if (!SR) {
        console.error("[speech] ❌ Aucune API SpeechRecognition disponible dans ce navigateur")
        setError("Micro non supporté ici — utilise le clavier vocal de ton téléphone directement dans le champ texte.")
        return
      }
      const rec = createConfiguredRecognition(SR)
      wireUpRealListening(rec, onResult, onNoResult, false, false)
    },
    [wireUpRealListening],
  )

  const stopListening = useCallback(() => {
    // Coupe aussi une éventuelle instance pré-chauffée jamais consommée (ex :
    // l'utilisateur quitte l'écran avant d'avoir parlé) pour libérer le micro.
    if (warmRef.current && !warmRef.current.consumed) {
      if (warmRef.current.idleTimer) clearTimeout(warmRef.current.idleTimer)
      try {
        warmRef.current.rec.stop()
      } catch (e) {
        // no-op
      }
      warmRef.current = null
    }
    try {
      recognitionRef.current?.stop()
    } catch (e) {
      // no-op
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
