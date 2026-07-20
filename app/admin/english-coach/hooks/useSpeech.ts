"use client"

import { useCallback, useRef, useState } from "react"

interface MinimalSpeechRecognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
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

  const supported = typeof window !== "undefined" && !!getSpeechRecognitionCtor()

  const startListening = useCallback((onResult: (transcript: string) => void) => {
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
      rec.interimResults = false
      rec.maxAlternatives = 1
      setError(null)
      setListening(true)

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        console.log(`[speech] ✅ onresult — transcript="${transcript}"`)
        onResult(transcript)
        setListening(false)
      }
      rec.onerror = (event: any) => {
        console.error("[speech] ❌ onerror —", event?.error || event)
        setError(`Micro bloqué ou refusé (${event?.error || "erreur inconnue"}) — utilise le clavier vocal de ton téléphone à la place.`)
        setListening(false)
      }
      rec.onend = () => {
        console.log("[speech] ⏹ onend (recognition terminée)")
        setListening(false)
      }
      if ("onstart" in rec) {
        ;(rec as any).onstart = () => console.log("[speech] 🎙 onstart (recognition démarrée)")
      }

      recognitionRef.current = rec
      rec.start()
      console.log("[speech] rec.start() appelé sans exception")
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
