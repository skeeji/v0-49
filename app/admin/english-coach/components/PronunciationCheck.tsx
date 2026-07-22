"use client"

import { useState } from "react"
import styles from "../coach.module.css"
import { useAudioRecorder } from "../hooks/useAudioRecorder"
import type { PronunciationResult } from "../types"

interface PronunciationCheckProps {
  referenceText: string
}

function accuracyClass(accuracy: number): string {
  if (accuracy >= 85) return styles.pronWordGood
  if (accuracy >= 70) return styles.pronWordMid
  return styles.pronWordBad
}

// Composant volontairement isolé : ne s'appelle QUE sur clic explicite du
// bouton (jamais automatiquement à chaque échange), pour rester dans le palier
// gratuit Azure Speech (5h audio/mois).
export function PronunciationCheck({ referenceText }: PronunciationCheckProps) {
  const [result, setResult] = useState<PronunciationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { recording, error: micError, startRecording, stopRecording } = useAudioRecorder()

  const toggleRecording = async () => {
    if (recording) {
      setLoading(true)
      setError(null)
      try {
        const blob = await stopRecording()
        if (!blob) {
          setError("Aucun son capté, réessaie.")
          setLoading(false)
          return
        }
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
    } else {
      setResult(null)
      setError(null)
      await startRecording()
    }
  }

  return (
    <div>
      <div className={styles.rowLeft}>
        <button className={`${styles.action} ${recording ? styles.bad : styles.primary}`} onClick={toggleRecording} disabled={loading}>
          {loading ? "Analyse..." : recording ? "⏹ Arrêter et analyser" : "🎙️ Vérifier ma prononciation"}
        </button>
      </div>

      {micError && <div className={styles.errorText}>{micError}</div>}
      {error && <div className={styles.errorText}>{error}</div>}

      {result && (
        <div style={{ marginTop: 10 }}>
          <div className={styles.pronWords}>
            {result.words.map((w, i) => (
              <span key={i} className={`${styles.pronWord} ${accuracyClass(w.accuracy)}`}>
                {w.word} {w.accuracy}%
              </span>
            ))}
          </div>
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
