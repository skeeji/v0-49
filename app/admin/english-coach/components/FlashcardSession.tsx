"use client"

import { useRef, useState } from "react"
import styles from "../coach.module.css"
import { CAT_LABELS } from "../data"
import { useSpeechRecognition } from "../hooks/useSpeech"
import { HoverWord } from "./HoverWord"
import { PronunciationCheck } from "./PronunciationCheck"
import type { CoachResponse, Word } from "../types"

interface FlashcardSessionProps {
  words: Word[]
  onUpdateWord: (wordId: string, mastery: number, wrong: number) => void
  onSessionTick: () => void
}

interface SessionResult {
  word: Word
  userAnswer: string
  correct: boolean
  betterPhrasing: string
  skipped: boolean
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

// Nombre de mots parmi les moins maîtrisés dans lesquels on pioche, avant de
// mélanger et de n'en garder que QUEUE_SIZE — un pool trop petit (ex: prendre
// strictement les 5 pires) fait retomber sur les mêmes cartes à chaque série.
const POOL_SIZE = 30
const QUEUE_SIZE = 10

function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQueue(words: Word[]): Word[] {
  const byPriority = [...words].sort((a, b) => a.mastery - b.mastery || b.wrong - a.wrong)
  const pool = shuffle(byPriority.slice(0, Math.min(POOL_SIZE, byPriority.length)))
  return pool.slice(0, QUEUE_SIZE)
}

export function FlashcardSession({ words, onUpdateWord, onSessionTick }: FlashcardSessionProps) {
  const [queue, setQueue] = useState<Word[]>(() => buildQueue(words))
  const [index, setIndex] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CoachResponse | null>(null)
  const [submittedAnswer, setSubmittedAnswer] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)
  const [feedbackTab, setFeedbackTab] = useState<"grammar" | "pron">("grammar")
  const [capturedAudio, setCapturedAudio] = useState<Blob | null>(null)
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([])
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
    setSubmittedAnswer("")
    setError(null)
    setLastTranscript(null)
    setFeedbackTab("grammar")
    setCapturedAudio(null)
    setSessionResults([])
  }

  const submit = async () => {
    if (!current || !inputValue.trim() || loading) return
    const answer = inputValue.trim()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "flashcard",
          targetPhrase: current.en,
          userAnswer: answer,
          context: CAT_CONTEXT[current.cat] || "Luxury retail lighting commissioning in Dubai",
          history: recentlyWrong.current,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: CoachResponse = await res.json()
      setResult(data)
      setSubmittedAnswer(answer)
      onSessionTick()

      // Une réponse de secours (échec IA) n'est pas un vrai verdict : elle ne doit
      // ni impacter la maîtrise du mot ni compter comme une faute dans le récap.
      if (!data.isFallback) {
        const newMastery = data.correct ? Math.min(5, current.mastery + 1) : Math.max(0, current.mastery - 1)
        const newWrong = data.correct ? current.wrong : current.wrong + 1
        onUpdateWord(current.id, newMastery, newWrong)

        if (!data.correct) {
          recentlyWrong.current = [current.en, ...recentlyWrong.current].slice(0, 5)
        }

        setSessionResults((prev) => [
          ...prev,
          { word: current, userAnswer: answer, correct: data.correct, betterPhrasing: data.better_phrasing_en, skipped: false },
        ])
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
    setSubmittedAnswer("")
    setError(null)
    setLastTranscript(null)
    setFeedbackTab("grammar")
    setCapturedAudio(null)
  }

  const skip = () => {
    if (!current || loading) return
    setSessionResults((prev) => [
      ...prev,
      { word: current, userAnswer: inputValue.trim(), correct: false, betterPhrasing: "", skipped: true },
    ])
    next()
  }

  if (done) {
    const answered = sessionResults.filter((r) => !r.skipped)
    const correctCount = answered.filter((r) => r.correct).length
    const wrongOnes = answered.filter((r) => !r.correct)
    const skippedCount = sessionResults.filter((r) => r.skipped).length

    return (
      <div className={styles.cardStage}>
        <div className={styles.badge}>Série terminée</div>
        <div className={`${styles.cardFr} ${styles.display}`}>Bien joué 👏</div>

        <div className={styles.statRow} style={{ width: "100%" }}>
          <div className={styles.stat}>
            <div className={styles.statVal}>{correctCount}</div>
            <div className={styles.statLbl}>bonnes réponses</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{wrongOnes.length}</div>
            <div className={styles.statLbl}>à retravailler</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{skippedCount}</div>
            <div className={styles.statLbl}>passées</div>
          </div>
        </div>

        {wrongOnes.length > 0 && (
          <>
            <div className={styles.badge} style={{ marginTop: 10 }}>
              Cartes à retravailler
            </div>
            <div className={styles.recapList}>
              {wrongOnes.map((r, i) => (
                <div key={i} className={styles.recapItem}>
                  <div className={styles.recapItemWord}>
                    {r.word.fr} <span className={styles.muted}>— {r.word.en}</span>
                  </div>
                  <div className={styles.recapItemRow}>
                    <span className={styles.muted}>Ta réponse : </span>
                    {r.userAnswer || "—"}
                  </div>
                  <div className={styles.recapItemRow}>
                    <span className={styles.muted}>En pro, on dirait : </span>
                    <strong>{r.betterPhrasing || r.word.en}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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
              onChange={(e) => {
                setInputValue(e.target.value)
                setCapturedAudio(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              disabled={loading}
            />
            <button
              className={styles.action}
              onClick={() =>
                startListening((t, audioBlob) => {
                  setInputValue(t)
                  setLastTranscript(t)
                  setCapturedAudio(audioBlob)
                })
              }
              disabled={loading}
            >
              {listening ? "🔴 Écoute..." : "🎤 Parler"}
            </button>
            <button className={`${styles.action} ${styles.primary}`} onClick={submit} disabled={loading}>
              {loading ? "Analyse..." : "Vérifier"}
            </button>
            <button className={styles.action} onClick={skip} disabled={loading}>
              Passer cette carte
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
            <div className={styles.userAnswerBox}>
              <span className={styles.muted}>Ta réponse : </span>
              <strong>{submittedAnswer}</strong>
            </div>

            <div className={`${styles.cardEn} ${styles.display}`}>
              <HoverWord fr={current.fr}>{current.en}</HoverWord>
            </div>
            <div className={`${styles.cardTip} ${styles.mono}`}>{current.tip}</div>

            <div className={styles.pronTabs}>
              <button
                className={`${styles.pronTab} ${feedbackTab === "grammar" ? styles.pronTabActive : ""}`}
                onClick={() => setFeedbackTab("grammar")}
              >
                Grammaire
              </button>
              <button
                className={`${styles.pronTab} ${feedbackTab === "pron" ? styles.pronTabActive : ""}`}
                onClick={() => setFeedbackTab("pron")}
              >
                Prononciation
              </button>
            </div>

            {feedbackTab === "grammar" ? (
              <div
                className={`${styles.feedback} ${
                  result.isFallback ? styles.errorText : result.correct ? styles.feedbackOk : styles.feedbackNo
                }`}
              >
                {result.isFallback ? "⚠ " : result.correct ? "✓ " : "✗ "}
                {result.feedback_fr}
                {!result.isFallback && result.better_phrasing_en && (
                  <div style={{ marginTop: 6 }}>
                    {result.correct ? "À connaître aussi : " : "En pro, on dirait : "}
                    <strong>{result.better_phrasing_en}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.pronPanel}>
                <PronunciationCheck referenceText={current.en} audioBlob={capturedAudio} />
              </div>
            )}

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
