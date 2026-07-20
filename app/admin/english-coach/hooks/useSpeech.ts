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

// onEnd est appelé une fois la synthèse vocale terminée — utilisé pour enchaîner
// automatiquement sur l'écoute du micro (mode appel téléphonique).
//
// Note Chrome : appeler speechSynthesis.speak() juste après .cancel() dans le même
// tick peut faire planter silencieusement l'utterance (ni onstart, ni onend, ni
// onerror ne se déclenchent alors) — bug connu du moteur. On laisse donc un court
// délai entre cancel() et speak() pour l'éviter.
export function speak(text: string, onEnd?: () => void) {
  console.log(`[speech] 🗣 speak() appelé — "${text}"`)
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.error("[speech] ❌ speechSynthesis indisponible")
    onEnd?.()
    return
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-GB"
    utterance.rate = 0.92
    let ended = false
    const finish = (label: string) => {
      if (ended) return
      ended = true
      console.log(`[speech] ⏹ utterance terminée (${label})`)
      onEnd?.()
    }
    utterance.onstart = () => console.log("[speech] ▶ utterance.onstart")
    if (onEnd) {
      utterance.onend = () => finish("onend")
      utterance.onerror = (e: any) => {
        console.error("[speech] ❌ utterance.onerror —", e?.error || e)
        finish("onerror")
      }
      // Filet de sécurité : si ni onend ni onerror ne se déclenchent (bug navigateur),
      // on débloque quand même l'enchaînement après un délai raisonnable.
      const estimatedMs = Math.max(3000, text.length * 80)
      setTimeout(() => {
        if (!ended) console.warn("[speech] ⏱ Timeout de secours — onend/onerror jamais reçu")
        finish("timeout")
      }, estimatedMs)
    }
    window.speechSynthesis.cancel()
    setTimeout(() => {
      console.log("[speech] window.speechSynthesis.speak() appelé")
      window.speechSynthesis.speak(utterance)
    }, 60)
  } catch (e) {
    console.error("[speech] ❌ Exception dans speak() —", e)
    onEnd?.()
  }
}

export function cancelSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return
  try {
    window.speechSynthesis.cancel()
  } catch (e) {
    // no-op
  }
}
