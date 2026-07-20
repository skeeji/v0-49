"use client"

import { useEffect, useRef, useState } from "react"
import styles from "../coach.module.css"
import { SCENARIOS } from "../data"
import { useSpeechRecognition, speak } from "../hooks/useSpeech"
import type { CoachResponse } from "../types"

const MAX_TURNS = 4

interface DialogueEntry {
  who: string
  line: string
  isUser: boolean
}

export function RoleplaySession() {
  const [scenarioKey, setScenarioKey] = useState<string | null>(null)
  const [dialogue, setDialogue] = useState<DialogueEntry[]>([])
  const [turn, setTurn] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFeedback, setLastFeedback] = useState<CoachResponse | null>(null)
  const recentlyWrong = useRef<string[]>([])

  const { listening, error: micError, startListening } = useSpeechRecognition()

  const scenario = scenarioKey ? SCENARIOS[scenarioKey] : null

  useEffect(() => {
    if (scenario && dialogue.length === 1) {
      speak(dialogue[0].line)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioKey])

  const startScenario = (key: string) => {
    const sc = SCENARIOS[key]
    setScenarioKey(key)
    setDialogue([{ who: sc.steps[0].who, line: sc.steps[0].line, isUser: false }])
    setTurn(0)
    setInputValue("")
    setLastFeedback(null)
    setError(null)
    recentlyWrong.current = []
  }

  const backToScenarios = () => {
    setScenarioKey(null)
    setDialogue([])
  }

  const submit = async () => {
    if (!scenario || !inputValue.trim() || loading) return
    const userLine = inputValue.trim()
    setLoading(true)
    setError(null)
    setLastFeedback(null)

    const lastCharacterLine = [...dialogue].reverse().find((d) => !d.isUser)?.line || scenario.steps[0].line

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "roleplay",
          targetPhrase: lastCharacterLine,
          userAnswer: userLine,
          context: scenario.context,
          history: recentlyWrong.current,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: CoachResponse = await res.json()

      setDialogue((d) => [...d, { who: "Toi", line: userLine, isUser: true }])
      setLastFeedback(data)
      setInputValue("")

      if (!data.correct) {
        recentlyWrong.current = [data.better_phrasing_en, ...recentlyWrong.current].slice(0, 5)
      }

      const nextTurn = turn + 1
      setTurn(nextTurn)

      if (nextTurn < MAX_TURNS && data.follow_up_en) {
        const character = scenario.steps[0].who
        setDialogue((d) => [...d, { who: character, line: data.follow_up_en, isUser: false }])
        speak(data.follow_up_en)
      }
    } catch (e) {
      console.error(e)
      setError("Le coach n'a pas pu répondre. Vérifie ta connexion et réessaie.")
    } finally {
      setLoading(false)
    }
  }

  if (!scenario) {
    return (
      <div>
        <div className={`${styles.muted}`} style={{ marginBottom: 14 }}>
          Choisis une simulation. Le personnage te parle à voix haute (🔊), tu réponds à l'écrit ou au micro.
        </div>
        <div className={styles.scenarioGrid}>
          {Object.entries(SCENARIOS).map(([key, s]) => (
            <div key={key} className={styles.scenarioCard} onClick={() => startScenario(key)}>
              <div className={styles.scenarioIcon}>{s.icon}</div>
              <div className={styles.scenarioTitle}>{s.title}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const finished = turn >= MAX_TURNS

  return (
    <div>
      <div className={styles.badge}>{scenario.title}</div>
      <div className={styles.dialogue} style={{ marginTop: 14 }}>
        {dialogue.map((entry, i) => (
          <div key={i} className={`${styles.bubble} ${entry.isUser ? styles.bubbleMe : styles.bubbleThem}`}>
            <div className={styles.bubbleWho}>
              {entry.who}
              {!entry.isUser && " 🔊"}
            </div>
            {entry.line}
          </div>
        ))}

        {lastFeedback && (
          <div className={`${styles.feedback} ${lastFeedback.correct ? styles.feedbackOk : styles.feedbackNo}`}>
            {lastFeedback.correct ? "✓ " : "✗ "}
            {lastFeedback.feedback_fr}
            {!lastFeedback.correct && (
              <div style={{ marginTop: 6 }}>
                En pro, on dirait : <strong>{lastFeedback.better_phrasing_en}</strong>
              </div>
            )}
          </div>
        )}

        {error && <div className={styles.errorText}>{error}</div>}

        {!finished ? (
          <>
            <div className={styles.rowLeft}>
              <input
                type="text"
                className={styles.input}
                placeholder="Ta réponse en anglais..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit()
                }}
                disabled={loading}
              />
              <button
                className={styles.action}
                onClick={() => startListening((t) => setInputValue(t))}
                disabled={loading}
              >
                {listening ? "🔴 Écoute..." : "🎤 Parler"}
              </button>
              <button className={`${styles.action} ${styles.primary}`} onClick={submit} disabled={loading}>
                {loading ? "Analyse..." : "Envoyer"}
              </button>
              <button
                className={styles.action}
                onClick={() => {
                  const lastLine = [...dialogue].reverse().find((d) => !d.isUser)?.line
                  if (lastLine) speak(lastLine)
                }}
              >
                🔊 Réécouter
              </button>
            </div>
            {micError && <div className={styles.errorText}>{micError}</div>}
          </>
        ) : (
          <>
            <div className={`${styles.feedback} ${styles.feedbackOk}`}>Scénario terminé. Bien géré 👏</div>
            <button className={`${styles.action} ${styles.primary}`} onClick={backToScenarios}>
              Retour aux scénarios
            </button>
          </>
        )}
      </div>
    </div>
  )
}
