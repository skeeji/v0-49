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
    const SR = getSpeechRecognitionCtor()
    if (!SR) {
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
        onResult(transcript)
        setListening(false)
      }
      rec.onerror = () => {
        setError("Micro bloqué ou refusé — utilise le clavier vocal de ton téléphone à la place.")
        setListening(false)
      }
      rec.onend = () => {
        setListening(false)
      }

      recognitionRef.current = rec
      rec.start()
    } catch (e) {
      setError("Micro indisponible ici — utilise le clavier vocal de ton téléphone.")
      setListening(false)
    }
  }, [])

  return { listening, error, supported, startListening }
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return
  try {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-GB"
    utterance.rate = 0.92
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  } catch (e) {
    console.error("TTS indisponible", e)
  }
}
