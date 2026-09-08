"use client"

import { useEffect, useRef, useState } from "react"
import styles from "../coach.module.css"
import { SURVIVAL_CAT_LABELS, SURVIVAL_CAT_CONTEXT, SURVIVAL_PHRASES, type SurvivalCategory, type SurvivalPhrase } from "../survival-data"
import { useSpeechRecognition } from "../hooks/useSpeech"
import { HoverWord } from "./HoverWord"
import { PronunciationCheck } from "./PronunciationCheck"
import type { CoachResponse } from "../types"

// Même principe que FlashcardSession (data.ts) mais sur le phrasebook de survie
// (survival-data.ts) : phrases courtes du quotidien à Dubaï (électricien,
// manager, douane, restaurant...) plutôt que le vocabulaire technique lighting.
// Composant volontairement autonome (progression, file d'attente, filtre par
// catégorie) pour ne rien changer au fonctionnement des Flashcards existantes.

interface SurvivalWord extends SurvivalPhrase {
  mastery: number
  wrong: number
  timesShown?: number
}

interface SessionResult {
  word: SurvivalWord
  userAnswer: string
  correct: boolean
  betterPhrasing: string
  skipped: boolean
}

const SERIES_SIZES = [10, 20, 30] as const
const DEFAULT_SERIES_SIZE = 10
const POOL_MULTIPLIER = 3
const MIN_POOL_SIZE = 20
// Préfixe des ids sauvegardés dans /api/progress (collection partagée avec les
// Flashcards, mais aucune collision possible : les mots de data.ts utilisent
// des ids "w1", "w2"... ou ceux d'extra-vocab.json).
const ID_PREFIX = "sp-"

function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQueue(words: SurvivalWord[], size: number): SurvivalWord[] {
  const byPriority = [...words].sort((a, b) => {
    const shownA = a.timesShown ?? 0
    const shownB = b.timesShown ?? 0
    if (shownA !== shownB) return shownA - shownB
    if (a.mastery !== b.mastery) return a.mastery - b.mastery
    return b.wrong - a.wrong
  })
  const poolSize = Math.min(byPriority.length, Math.max(size * POOL_MULTIPLIER, MIN_POOL_SIZE))
  const pool = shuffle(byPriority.slice(0, poolSize))
  return pool.slice(0, Math.min(size, pool.length))
}

function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()]/g, "")
    .replace(/\s+/g, " ")
}

const CATEGORY_FILTERS: { key: SurvivalCategory | "ALL"; label: string }[] = [
  { key: "ALL", label: "Toutes" },
  { key: "ELEC", label: SURVIVAL_CAT_LABELS.ELEC },
  { key: "MGR", label: SURVIVAL_CAT_LABELS.MGR },
  { key: "CUS", label: SURVIVAL_CAT_LABELS.CUS },
  { key: "REST", label: SURVIVAL_CAT_LABELS.REST },
  { key: "HOTEL", label: SURVIVAL_CAT_LABELS.HOTEL },
  { key: "TAXI", label: SURVIVAL_CAT_LABELS.TAXI },
  { key: "SHOP", label: SURVIVAL_CAT_LABELS.SHOP },
  { key: "EMER", label: SURVIVAL_CAT_LABELS.EMER },
  { key: "SOC", label: SURVIVAL_CAT_LABELS.SOC },
  { key: "GEN", label: SURVIVAL_CAT_LABELS.GEN },
]

export function SurvivalPhrasesSession() {
  const [allWords, setAllWords] = useState<SurvivalWord[]>(() =>
    SURVIVAL_PHRASES.map((p) => ({ ...p, mastery: 0, wrong: 0, timesShown: 0 })),
  )
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<SurvivalCategory | "ALL">("ALL")
  const [seriesSize, setSeriesSize] = useState<number>(DEFAULT_SERIES_SIZE)
  const [queue, setQueue] = useState<SurvivalWord[]>([])
  const [index, setIndex] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CoachResponse | null>(null)
  const [submittedAnswer, setSubmittedAnswer] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)
  const [feedbackTab, setFeedbackTab] = useState<"grammar" | "pron">("grammar")
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([])
  const recentlyWrong = useRef<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const started = useRef(false)

  const { listening, micReady, error: micError, startListening, stopListening, prewarm } = useSpeechRecognition()

  const current = queue[index]
  const done = started.current && index >= queue.length

  // Charge la progression sauvegardée (même collection que les Flashcards,
  // filtrée sur les ids "sp-" propres à ce phrasebook).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/progress")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled || !data.success) return
        const byId = new Map(data.progress.filter((p: any) => String(p.word_id).startsWith(ID_PREFIX)).map((p: any) => [p.word_id, p]))
        setAllWords((prev) =>
          prev.map((w) => {
            const saved: any = byId.get(w.id)
            return saved ? { ...w, mastery: saved.mastery, wrong: saved.wrong_count, timesShown: saved.times_shown } : w
          }),
        )
      } catch (e) {
        console.error("Erreur chargement progression (phrases utiles):", e)
      } finally {
        if (!cancelled) setLoadingProgress(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Premier tirage de série une fois la progression chargée.
  useEffect(() => {
    if (!loadingProgress && !started.current) {
      started.current = true
      setQueue(buildQueue(allWords, seriesSize))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProgress])

  useEffect(() => {
    if (current && !done && !listening) prewarm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, done, listening, prewarm])

  useEffect(() => stopListening, [stopListening])

  // Marque une phrase comme vue + sauvegarde côté serveur.
  const markShown = (wordId: string) => {
    setAllWords((prev) => {
      const updated = prev.map((w) => (w.id === wordId ? { ...w, timesShown: (w.timesShown ?? 0) + 1 } : w))
      const w = updated.find((x) => x.id === wordId)
      if (w) {
        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word_id: wordId, mastery: w.mastery, wrong_count: w.wrong, times_shown: w.timesShown ?? 0 }),
        }).catch((e) => console.error("Erreur sauvegarde progression (phrases utiles):", e))
      }
      return updated
    })
  }

  const updateMastery = (wordId: string, mastery: number, wrong: number) => {
    setAllWords((prev) => {
      const updated = prev.map((w) => (w.id === wordId ? { ...w, mastery, wrong } : w))
      const w = updated.find((x) => x.id === wordId)
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word_id: wordId, mastery, wrong_count: wrong, times_shown: w?.timesShown ?? 0 }),
      }).catch((e) => console.error("Erreur sauvegarde progression (phrases utiles):", e))
      return updated
    })
  }

  useEffect(() => {
    if (current) markShown(current.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  const resetCardUi = () => {
    setInputValue("")
    setResult(null)
    setSubmittedAnswer("")
    setError(null)
    setLastTranscript(null)
    setFeedbackTab("grammar")
  }

  const pool = () => (categoryFilter === "ALL" ? allWords : allWords.filter((w) => w.cat === categoryFilter))

  const restart = (size: number = seriesSize, category: SurvivalCategory | "ALL" = categoryFilter) => {
    setSeriesSize(size)
    setCategoryFilter(category)
    const source = category === "ALL" ? allWords : allWords.filter((w) => w.cat === category)
    setQueue(buildQueue(source, size))
    setIndex(0)
    resetCardUi()
    setSessionResults([])
  }

  const submit = async () => {
    if (!current || !inputValue.trim() || loading) return
    const answer = inputValue.trim()

    if (normalizeAnswer(answer) === normalizeAnswer(current.en)) {
      const instant: CoachResponse = {
        correct: true,
        score: 5,
        feedback_fr: "Formulation strictement identique à la référence — validée instantanément, sans appel IA.",
        better_phrasing_en: "",
      }
      setResult(instant)
      setSubmittedAnswer(answer)
      updateMastery(current.id, Math.min(5, current.mastery + 1), current.wrong)
      setSessionResults((prev) => [...prev, { word: current, userAnswer: answer, correct: true, betterPhrasing: "", skipped: false }])
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
          context: SURVIVAL_CAT_CONTEXT[current.cat],
          history: recentlyWrong.current,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: CoachResponse = await res.json()
      setResult(data)
      setSubmittedAnswer(answer)

      if (!data.isFallback) {
        const newMastery = data.correct ? Math.min(5, current.mastery + 1) : Math.max(0, current.mastery - 1)
        const newWrong = data.correct ? current.wrong : current.wrong + 1
        updateMastery(current.id, newMastery, newWrong)

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
    setSessionResults((prev) => [...prev, { word: current, userAnswer: inputValue.trim(), correct: false, betterPhrasing: "", skipped: true }])
    next()
  }

  if (loadingProgress) {
    return <div className={styles.loading}>Chargement de ta progression…</div>
  }

  const categorySelector = (
    <div className={styles.row} style={{ marginTop: 0, marginBottom: 4, flexWrap: "wrap" }}>
      <span className={`${styles.muted} ${styles.mono}`} style={{ fontSize: 11, alignSelf: "center" }}>
        Situation :
      </span>
      {CATEGORY_FILTERS.map((c) => (
        <button
          key={c.key}
          className={`${styles.action} ${c.key === categoryFilter ? styles.primary : ""}`}
          style={{ padding: "4px 10px" }}
          onClick={() => restart(seriesSize, c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  )

  const seriesSizeSelector = (
    <div className={styles.row} style={{ marginTop: 0, marginBottom: 4 }}>
      <span className={`${styles.muted} ${styles.mono}`} style={{ fontSize: 11, alignSelf: "center" }}>
        Phrases par série :
      </span>
      {SERIES_SIZES.map((size) => (
        <button
          key={size}
          className={`${styles.action} ${size === seriesSize ? styles.primary : ""}`}
          style={{ padding: "4px 10px" }}
          onClick={() => restart(size, categoryFilter)}
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
        {categorySelector}
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
              Phrases à retravailler
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

  if (!current) {
    return (
      <div>
        {categorySelector}
        <div className={styles.muted}>Aucune phrase dans cette catégorie.</div>
      </div>
    )
  }

  return (
    <div>
      {categorySelector}
      {seriesSizeSelector}
      <div className={styles.badge}>{SURVIVAL_CAT_LABELS[current.cat]}</div>
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
            <button className={styles.action} onClick={skip} disabled={loading}>
              Passer cette phrase
            </button>
          </div>
        )}

        {listening && !result && (
          <div className={`${styles.muted} ${styles.mono}`} style={{ fontSize: 12 }}>
            {micReady ? "🎤 Prêt, tu peux parler" : "🎤 Démarrage du micro..."}
          </div>
        )}

        {lastTranscript && !result && (
          <div className={`${styles.muted} ${styles.mono}`} style={{ fontSize: 12 }}>
            🎤 Transcription détectée : « {lastTranscript} » —{" "}
            <button className={styles.resetLink} style={{ margin: 0, display: "inline" }} onClick={() => inputRef.current?.focus()}>
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
                <PronunciationCheck referenceText={current.en} />
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
