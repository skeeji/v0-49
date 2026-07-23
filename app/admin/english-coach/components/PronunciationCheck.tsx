"use client"

import { useState } from "react"
import styles from "../coach.module.css"
import { useAudioRecorder } from "../hooks/useAudioRecorder"
import { speak } from "../hooks/useSpeech"
import type { PronunciationResult } from "../types"

interface PronunciationCheckProps {
  referenceText: string
}

// Voix neutre fixe pour la prononciation "modèle" — volontairement indépendante
// de la voix du personnage (roleplay/appel) : il s'agit ici d'entendre comment
// un professeur prononcerait la phrase, pas le personnage de la scène.
const REFERENCE_VOICE = "en-GB-SoniaNeural"

function accuracyClass(accuracy: number): string {
  if (accuracy >= 85) return styles.pronWordGood
  if (accuracy >= 70) return styles.pronWordMid
  return styles.pronWordBad
}

const ERROR_LABELS_FR: Record<string, string> = {
  Mispronunciation: "mal prononcé",
  Omission: "mot omis",
  Insertion: "mot ajouté en trop",
  UnexpectedBreak: "pause inattendue",
  MissingBreak: "pause manquante",
  Monotone: "intonation plate",
}

// Composant volontairement isolé : ne s'appelle QUE sur clic explicite du
// bouton (jamais automatiquement à chaque échange), pour rester dans le palier
// gratuit Azure Speech (5h audio/mois).
//
// Capture audio strictement séparée de la dictée (SpeechRecognition) : ce
// composant démarre son propre getUserMedia/MediaRecorder uniquement quand
// l'utilisateur clique sur "Vérifier ma prononciation", jamais en parallèle
// d'une reconnaissance vocale en cours ailleurs sur la page. L'utilisateur
// reparle la phrase spécifiquement pour cette vérification.
export function PronunciationCheck({ referenceText }: PronunciationCheckProps) {
  const [result, setResult] = useState<PronunciationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Index du mot dont le détail (type d'erreur + phonèmes) est déplié.
  const [expandedWord, setExpandedWord] = useState<number | null>(null)
  const [playingReference, setPlayingReference] = useState(false)
  const { recording, error: micError, startRecording, stopRecording } = useAudioRecorder()

  const playReference = () => {
    if (!referenceText.trim() || playingReference) return
    setPlayingReference(true)
    speak(referenceText, REFERENCE_VOICE, () => setPlayingReference(false))
  }

  const analyze = async (blob: Blob) => {
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("audio", blob, "answer.webm")
      form.append("referenceText", referenceText)
      const res = await fetch("/api/pronunciation", { method: "POST", body: form })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: PronunciationResult = await res.json()
      setResult(data)
    } catch (e) {
      console.error("[pronunciation] ❌", e)
      setError("La vérification de prononciation a échoué, réessaie.")
    } finally {
      setLoading(false)
    }
  }

  const toggleManualRecording = async () => {
    if (recording) {
      setLoading(true)
      setError(null)
      const blob = await stopRecording()
      if (!blob) {
        setLoading(false)
        setError("Aucun son capté, réessaie.")
        return
      }
      setResult(null)
      setExpandedWord(null)
      await analyze(blob)
    } else {
      setResult(null)
      setExpandedWord(null)
      setError(null)
      await startRecording()
    }
  }

  return (
    <div>
      <div className={styles.rowLeft}>
        <button className={styles.action} onClick={playReference} disabled={playingReference}>
          {playingReference ? "🔊 Lecture..." : "🔊 Écouter la prononciation correcte"}
        </button>
        <button className={`${styles.action} ${recording ? styles.bad : styles.primary}`} onClick={toggleManualRecording} disabled={loading}>
          {loading ? "Analyse..." : recording ? "⏹ Arrêter et analyser" : "🎙️ Vérifier ma prononciation"}
        </button>
      </div>

      {micError && <div className={styles.errorText}>{micError}</div>}
      {error && <div className={styles.errorText}>{error}</div>}

      {result && (
        <div style={{ marginTop: 10 }}>
          <div className={styles.pronWords}>
            {result.words.map((w, i) => {
              const hasDetail = w.errorType !== "None" || w.phonemes.length > 0
              return (
                <button
                  key={i}
                  type="button"
                  className={`${styles.pronWord} ${accuracyClass(w.accuracy)}`}
                  style={{ cursor: hasDetail ? "pointer" : "default", font: "inherit" }}
                  onClick={() => hasDetail && setExpandedWord(expandedWord === i ? null : i)}
                >
                  {w.word} {w.accuracy}%
                </button>
              )
            })}
          </div>

          {expandedWord !== null && result.words[expandedWord] && (
            <div className={styles.pronDetail}>
              {result.words[expandedWord].errorType !== "None" && (
                <div>
                  <strong>{result.words[expandedWord].word}</strong> —{" "}
                  {ERROR_LABELS_FR[result.words[expandedWord].errorType] || result.words[expandedWord].errorType}
                </div>
              )}
              {result.words[expandedWord].phonemes.length > 0 && (
                <div className={styles.pronPhonemes}>
                  {result.words[expandedWord].phonemes.map((p, j) => (
                    <span key={j} className={`${styles.pronPhoneme} ${accuracyClass(p.accuracy)}`}>
                      /{p.phoneme}/ {p.accuracy}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={styles.pronScores}>
            <span>
              Précision : <strong>{result.overall}%</strong>
            </span>
            <span>
              Fluence : <strong>{result.fluency}%</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
