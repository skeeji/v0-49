"use client"

import { useRef, useState } from "react"
import styles from "../coach.module.css"
import { SCENARIOS } from "../data"
import { useSpeechRecognition, speak, cancelSpeech } from "../hooks/useSpeech"
import type { PhoneCallCoachResponse } from "../types"

const CALLABLE_SCENARIOS = ["customs", "electrician", "manager"]

interface LogEntry {
  isUser: boolean
  line: string
  correction_fr?: string | null
}

export function PhoneCallSession() {
  const [scenarioKey, setScenarioKey] = useState<string | null>(null)
  const [callActive, setCallActive] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const askedQuestions = useRef<string[]>([])
  const lastQuestion = useRef<string>("")
  const callActiveRef = useRef(false)

  const { listening, error: micError, supported: micSupported, startListening, stopListening } =
    useSpeechRecognition()

  const scenario = scenarioKey ? SCENARIOS[scenarioKey] : null

  const askNext = (question: string) => {
    lastQuestion.current = question
    setLog((l) => [...l, { isUser: false, line: question }])
    setSpeaking(true)
    speak(question, () => {
      setSpeaking(false)
      if (!callActiveRef.current) return
      startListening((transcript) => handleAnswer(transcript))
    })
  }

  const startCall = (key: string) => {
    if (!micSupported) {
      setError("Ce mode nécessite un micro compatible (Chrome/Edge, sur une connexion HTTPS).")
      return
    }
    const sc = SCENARIOS[key]
    setScenarioKey(key)
    setCallActive(true)
    callActiveRef.current = true
    setLog([])
    setError(null)
    const opening = sc.openingLines[Math.floor(Math.random() * sc.openingLines.length)]
    askedQuestions.current = [opening]
    askNext(opening)
  }

  const handleAnswer = async (transcript: string) => {
    if (!scenario || !callActiveRef.current) return
    setLog((l) => [...l, { isUser: true, line: transcript }])
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "phone_call",
          targetPhrase: lastQuestion.current,
          userAnswer: transcript,
          context: scenario.context,
          history: askedQuestions.current,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: PhoneCallCoachResponse = await res.json()

      if (!callActiveRef.current) return

      if (data.correction_fr) {
        setLog((l) => {
          const copy = [...l]
          copy[copy.length - 1] = { ...copy[copy.length - 1], correction_fr: data.correction_fr }
          return copy
        })
      }

      setLoading(false)
      if (data.next_question_en) {
        askedQuestions.current = [data.next_question_en, ...askedQuestions.current].slice(0, 10)
        askNext(data.next_question_en)
      } else {
        // Ne devrait plus arriver (le serveur garantit next_question_en non-vide),
        // mais on ne laisse jamais l'appel se bloquer silencieusement.
        setError("Le coach n'a pas pu relancer la conversation, réessaie ou raccroche.")
      }
    } catch (e) {
      console.error(e)
      setError("Le coach n'a pas pu répondre. Vérifie ta connexion.")
      setLoading(false)
    }
  }

  const hangUp = () => {
    callActiveRef.current = false
    setCallActive(false)
    setSpeaking(false)
    stopListening()
    cancelSpeech()
  }

  const backToPicker = () => {
    setScenarioKey(null)
    setLog([])
    setError(null)
  }

  if (!scenarioKey) {
    return (
      <div>
        <div className={styles.muted} style={{ marginBottom: 14 }}>
          Appel 100% vocal : le personnage parle, le micro s'active tout seul après chaque question. Réponds à voix
          haute, comme un vrai appel.
        </div>
        <div className={styles.scenarioGrid}>
          {CALLABLE_SCENARIOS.map((key) => {
            const s = SCENARIOS[key]
            return (
              <button key={key} type="button" className={styles.scenarioCard} onClick={() => startCall(key)}>
                <div className={styles.scenarioIcon}>{s.icon}</div>
                <div className={styles.scenarioTitle}>{s.title}</div>
              </button>
            )
          })}
        </div>
        {error && <div className={styles.errorText}>{error}</div>}
      </div>
    )
  }

  return (
    <div>
      <div className={styles.rowLeft} style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <div className={styles.badge}>📞 {SCENARIOS[scenarioKey].title}</div>
        {callActive ? (
          <button className={`${styles.action} ${styles.bad}`} onClick={hangUp}>
            📴 Raccrocher
          </button>
        ) : (
          <button className={`${styles.action} ${styles.primary}`} onClick={backToPicker}>
            Retour
          </button>
        )}
      </div>

      <div className={styles.dialogue}>
        {log.map((entry, i) => (
          <div key={i}>
            <div className={`${styles.bubble} ${entry.isUser ? styles.bubbleMe : styles.bubbleThem}`}>
              <div className={styles.bubbleWho}>{entry.isUser ? "Toi" : "🔊 Correspondant"}</div>
              {entry.line}
            </div>
            {entry.correction_fr && (
              <div className={`${styles.feedback} ${styles.feedbackNo}`} style={{ marginTop: 4 }}>
                💬 {entry.correction_fr}
              </div>
            )}
          </div>
        ))}

        {callActive && (
          <div className={`${styles.muted} ${styles.mono}`} style={{ textAlign: "center", fontSize: 12 }}>
            {loading
              ? "Analyse de ta réponse..."
              : listening
                ? "🔴 Écoute en cours..."
                : speaking
                  ? "🔊 Le correspondant parle..."
                  : "⏳ Connexion..."}
          </div>
        )}

        {!callActive && (
          <div className={`${styles.feedback} ${styles.feedbackOk}`}>
            Appel terminé. Bien joué 👏
            <div className={styles.row} style={{ marginTop: 10 }}>
              <button className={`${styles.action} ${styles.primary}`} onClick={() => startCall(scenarioKey)}>
                Rappeler
              </button>
              <button className={styles.action} onClick={backToPicker}>
                Changer de scénario
              </button>
            </div>
          </div>
        )}

        {micError && <div className={styles.errorText}>{micError}</div>}
        {error && <div className={styles.errorText}>{error}</div>}
      </div>
    </div>
  )
}
