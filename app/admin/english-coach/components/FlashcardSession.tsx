"use client"

import { useEffect, useRef, useState } from "react"
import styles from "../coach.module.css"
import { CAT_LABELS } from "../data"
import { useSpeechRecognition } from "../hooks/useSpeech"
import { HoverWord } from "./HoverWord"
import { PronunciationCheck } from "./PronunciationCheck"
import type { CoachResponse, Word } from "../types"

interface FlashcardSessionProps {
  words: Word[]
  onUpdateWord: (wordId: string, mastery: number, wrong: number) => void
  onWordShown: (wordId: string) => void
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

const SERIES_SIZES = [10, 20, 30, 50] as const
const DEFAULT_SERIES_SIZE = 10
// Le pool dans lequel on pioche est plus large que la série elle-même, pour
// éviter de retomber toujours sur les mêmes cartes.
const POOL_MULTIPLIER = 3
const MIN_POOL_SIZE = 20

function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQueue(words: Word[], size: number): Word[] {
  // Priorité 1 : les mots jamais (ou moins) montrés remontent en premier — c'est
  // ce qui garantit qu'au fil des séries, chaque mot du pool finit par sortir au
  // moins une fois avant qu'un mot déjà vu ne repasse une deuxième fois.
  // Priorité 2 : parmi une même "fraîcheur", les moins maîtrisés / plus ratés.
  const byPriority = [...words].sort((a, b) => {
    const shownA = a.timesShown ?? 0
    const shownB = b.timesShown ?? 0
    if (shownA !== shownB) return shownA - shownB
    if (a.mastery !== b.mastery) return a.mastery - b.mastery
    return b.wrong - a.wrong
  })
  const poolSize = Math.min(byPriority.length, Math.max(size * POOL_MULTIPLIER, MIN_POOL_SIZE))
  const pool = shuffle(byPriority.slice(0, poolSize))
  return pool.slice(0, size)
}

function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()]/g, "")
    .replace(/\s+/g, " ")
}

export function FlashcardSession({ words, onUpdateWord, onWordShown, onSessionTick }: FlashcardSessionProps) {
  const [seriesSize, setSeriesSize] = useState<number>(DEFAULT_SERIES_SIZE)
  const [queue, setQueue] = useState<Word[]>(() => buildQueue(words, DEFAULT_SERIES_SIZE))
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

  // Marque chaque carte comme "vue" dès qu'elle s'affiche, indépendamment du
  // fait qu'elle soit ensuite répondue ou passée — c'est ce compteur qui nourrit
  // la priorité de buildQueue pour garantir la couverture de tout le pool.
  useEffect(() => {
    if (current) onWordShown(current.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  const resetCardUi = () => {
    setInputValue("")
    setResult(null)
    setSubmittedAnswer("")
    setError(null)
    setLastTranscript(null)
    setFeedbackTab("grammar")
    setCapturedAudio(null)
  }

  const restart = (size: number = seriesSize) => {
    setSeriesSize(size)
    setQueue(buildQueue(words, size))
    setIndex(0)
    resetCardUi()
    setSessionResults([])
  }

  const submit = async () => {
    if (!current || !inputValue.trim() || loading) return
    const answer = inputValue.trim()

    // Court-circuit : si la réponse correspond (à la casse/ponctuation près) au
    // mot-cible, on valide instantanément sans appeler l'IA — inutile de payer
    // une latence réseau pour juger une correspondance déjà évidente.
    if (normalizeAnswer(answer) === normalizeAnswer(current.en)) {
      const instant: CoachResponse = {
        correct: true,
        score: 5,
        feedback_fr: "Formulation strictement identique à la référence — validée instantanément, sans appel IA.",
        better_phrasing_en: "",
      }
      setResult(instant)
      setSubmittedAnswer(answer)
      onSessionTick()
      onUpdateWord(current.id, Math.min(5, current.mastery + 1), current.wrong)
      setSessionResults((prev) => [
        ...prev,
        { word: current, userAnswer: answer, correct: true, betterPhrasing: "", skipped: false },
      ])
      return
    }

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
    resetCardUi()
  }

  const skip = () => {
    if (!current || loading) return
    setSessionResults((prev) => [
      ...prev,
      { word: current, userAnswer: inputValue.trim(), correct: false, betterPhrasing: "", skipped: true },
    ])
    next()
  }

  const seriesSizeSelector = (
    <div className={styles.row} style={{ marginTop: 0, marginBottom: 4 }}>
      <span className={`${styles.muted} ${styles.mono}`} style={{ fontSize: 11, alignSelf: "center" }}>
        Questions par série :
      </span>
      {SERIES_SIZES.map((size) => (
        <button
          key={size}
          className={`${styles.action} ${size === seriesSize ? styles.primary : ""}`}
          style={{ padding: "4px 10px" }}
          onClick={() => restart(size)}
        >
          {size}
        </button>
      ))}
    </div>
  )

  if (done) {
    const answered = sessionResults.filter((r) => !r.skipped)
    const correctCount = answered.filter((r) => r.correct).length
    const wrongOnes = answered.filter((r) => !r.correct)
    const skippedCount = sessionResults.filter((r) => r.skipped).length

    return (
      <div className={styles.cardStage}>
        {seriesSizeSelector}
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

        <button className={`${styles.action} ${styles.primary}`} onClick={() => restart()}>
          Refaire une série
        </button>
      </div>
    )
  }

  return (
    <div>
      {seriesSizeSelector}
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
