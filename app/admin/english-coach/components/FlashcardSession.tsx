"use client"

import { useRef, useState } from "react"
import styles from "../coach.module.css"
import { CAT_LABELS } from "../data"
import { useSpeechRecognition } from "../hooks/useSpeech"
import type { CoachResponse, Word } from "../types"

interface FlashcardSessionProps {
  words: Word[]
  onUpdateWord: (wordId: string, mastery: number, wrong: number) => void
  onSessionTick: () => void
}

const CAT_CONTEXT: Record<string, string> = {
  OPT: "Optics & Fixtures, luxury retail lighting commissioning in Dubai",
  DALI: "DALI protocol & electrical wiring, luxury retail lighting commissioning in Dubai",
  LUX: "Luxury retail management & showroom presentation in Dubai",
  TRV: "Travel and airport survival English for a business trip to Dubai",
  NUM: "Technical numbers and units for lighting commissioning in Dubai",
  DIP: "Diplomatic workplace English on a retail construction site in Dubai",
  TRB: "Troubleshooting technical issues on site, luxury retail lighting in Dubai",
}

function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQueue(words: Word[]): Word[] {
  // Groupe par priorité (mastery croissant, wrong décroissant), puis mélange chaque
  // groupe de priorité égale (Fisher-Yates) pour éviter un ordre toujours identique
  // quand plusieurs mots ont le même mastery/wrong (ex: tous à 0 en début de session).
  const groups = new Map<string, Word[]>()
  for (const w of words) {
    const key = `${w.mastery}-${w.wrong}`
    const group = groups.get(key)
    if (group) group.push(w)
    else groups.set(key, [w])
  }
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const [masteryA, wrongA] = a.split("-").map(Number)
    const [masteryB, wrongB] = b.split("-").map(Number)
    return masteryA - masteryB || wrongB - wrongA
  })
  const ordered = sortedKeys.flatMap((key) => shuffle(groups.get(key)!))
  return ordered.slice(0, 5)
}

export function FlashcardSession({ words, onUpdateWord, onSessionTick }: FlashcardSessionProps) {
  const [queue, setQueue] = useState<Word[]>(() => buildQueue(words))
  const [index, setIndex] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CoachResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)
  const recentlyWrong = useRef<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const { listening, error: micError, startListening } = useSpeechRecognition()

  const current = queue[index]
  const done = index >= queue.length

  const restart = () => {
    setQueue(buildQueue(words))
    setIndex(0)
    setInputValue("")
    setResult(null)
    setError(null)
    setLastTranscript(null)
  }

  const submit = async () => {
    if (!current || !inputValue.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "flashcard",
          targetPhrase: current.en,
          userAnswer: inputValue.trim(),
          context: CAT_CONTEXT[current.cat] || "Luxury retail lighting commissioning in Dubai",
          history: recentlyWrong.current,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: CoachResponse = await res.json()
      setResult(data)
      onSessionTick()

      const newMastery = data.correct ? Math.min(5, current.mastery + 1) : Math.max(0, current.mastery - 1)
      const newWrong = data.correct ? current.wrong : current.wrong + 1
      onUpdateWord(current.id, newMastery, newWrong)

      if (!data.correct) {
        recentlyWrong.current = [current.en, ...recentlyWrong.current].slice(0, 5)
      }
    } catch (e) {
      console.error(e)
      setError("Le coach n'a pas pu répondre. Vérifie ta connexion et réessaie.")
    } finally {
      setLoading(false)
    }
  }

  const next = () => {
    setIndex((i) => i + 1)
    setInputValue("")
    setResult(null)
    setError(null)
    setLastTranscript(null)
  }

  if (done) {
    return (
      <div className={styles.cardStage}>
        <div className={styles.badge}>Session terminée</div>
        <div className={`${styles.cardFr} ${styles.display}`}>Bien joué 👏</div>
        <div className={styles.cardTip}>
          {queue.length} mots retravaillés avec un vrai feedback IA. Reviens plus tard, les mots ratés remonteront en
          priorité.
        </div>
        <button className={`${styles.action} ${styles.primary}`} onClick={restart}>
          Refaire une série
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.badge}>{CAT_LABELS[current.cat]}</div>
      <div className={styles.cardStage}>
        <div className={`${styles.cardFr} ${styles.display}`}>{current.fr}</div>

        {!result && (
          <div className={styles.row}>
            <input
              ref={inputRef}
              type="text"
              className={styles.input}
              placeholder="Traduis en anglais..."
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              disabled={loading}
            />
            <button
              className={styles.action}
              onClick={() =>
                startListening((t) => {
                  setInputValue(t)
                  setLastTranscript(t)
                })
              }
              disabled={loading}
            >
              {listening ? "🔴 Écoute..." : "🎤 Parler"}
            </button>
            <button className={`${styles.action} ${styles.primary}`} onClick={submit} disabled={loading}>
              {loading ? "Analyse..." : "Vérifier"}
            </button>
          </div>
        )}

        {lastTranscript && !result && (
          <div className={`${styles.muted} ${styles.mono}`} style={{ fontSize: 12 }}>
            🎤 Transcription détectée : « {lastTranscript} » —{" "}
            <button
              className={styles.resetLink}
              style={{ margin: 0, display: "inline" }}
              onClick={() => inputRef.current?.focus()}
            >
              corriger le texte
            </button>
          </div>
        )}

        {micError && <div className={styles.errorText}>{micError}</div>}
        {error && <div className={styles.errorText}>{error}</div>}

        {result && (
          <>
            <div className={`${styles.cardEn} ${styles.display}`}>{current.en}</div>
            <div className={`${styles.cardTip} ${styles.mono}`}>{current.tip}</div>
            <div className={`${styles.feedback} ${result.correct ? styles.feedbackOk : styles.feedbackNo}`}>
              {result.correct ? "✓ " : "✗ "}
              {result.feedback_fr}
              {result.better_phrasing_en && (
                <div style={{ marginTop: 6 }}>
                  {result.correct ? "À connaître aussi : " : "En pro, on dirait : "}
                  <strong>{result.better_phrasing_en}</strong>
                </div>
              )}
            </div>
            <div className={styles.row}>
              <button className={`${styles.action} ${styles.primary}`} onClick={next}>
                Suivant
              </button>
            </div>
          </>
        )}

        <div className={styles.progressDots}>
          {queue.map((_, i) => (
            <div key={i} className={`${styles.dot} ${i < index ? styles.dotDone : ""}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
