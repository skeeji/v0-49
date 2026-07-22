"use client"

import { useRef, useState } from "react"
import styles from "../coach.module.css"
import { SCENARIOS, ROLEPLAY_TOPICS } from "../data"
import { useSpeechRecognition, speak } from "../hooks/useSpeech"
import { HoverWord } from "./HoverWord"
import { PronunciationCheck } from "./PronunciationCheck"
import type { RoleplayCoachResponse, Scenario, ScenarioPart } from "../types"

// Une "session de sujets" dure entre 5 et 8 tours avant que l'échange soit
// considéré comme naturellement terminé et qu'un nouveau tirage de sujets ait
// lieu — voir pickTurnsTarget().
function pickTurnsTarget(): number {
  return 5 + Math.floor(Math.random() * 4)
}

function pickTopics(): string[] {
  const shuffled = [...ROLEPLAY_TOPICS].sort(() => Math.random() - 0.5)
  const count = 1 + Math.floor(Math.random() * 3)
  return shuffled.slice(0, count)
}

type DialogueEntry =
  | { type: "bubble"; who: string; line: string; fr?: string; isUser: boolean }
  | { type: "transition"; text: string }

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function getParts(scenario: Scenario, key: string): ScenarioPart[] {
  return scenario.parts && scenario.parts.length ? scenario.parts : [{ scenarioKey: key }]
}

export function RoleplaySession() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [parts, setParts] = useState<ScenarioPart[]>([])
  const [partIndex, setPartIndex] = useState(0)
  const [turnInPart, setTurnInPart] = useState(0)
  const [dialogue, setDialogue] = useState<DialogueEntry[]>([])
  const [inputValue, setInputValue] = useState("")
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFeedback, setLastFeedback] = useState<{ coherent: boolean; suggestion_fr: string } | null>(null)
  const [lastUserLine, setLastUserLine] = useState<string | null>(null)
  const [feedbackTab, setFeedbackTab] = useState<"grammar" | "pron">("grammar")
  const askedQuestions = useRef<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionTopics = useRef<string[]>([])
  const turnsTarget = useRef<number>(pickTurnsTarget())

  const { listening, error: micError, startListening } = useSpeechRecognition()

  const activePart = parts[partIndex]
  const activeScenario = activePart ? SCENARIOS[activePart.scenarioKey] : null
  const finished = selectedKey !== null && partIndex >= parts.length

  const openPart = (scenario: Scenario, transition?: string) => {
    sessionTopics.current = pickTopics()
    turnsTarget.current = pickTurnsTarget()
    const line = pickRandom(scenario.openingLines)
    askedQuestions.current = [line.en, ...askedQuestions.current].slice(0, 10)
    const entries: DialogueEntry[] = []
    if (transition) entries.push({ type: "transition", text: transition })
    entries.push({ type: "bubble", who: scenario.who, line: line.en, fr: line.fr, isUser: false })
    setDialogue((d) => [...d, ...entries])
    speak(line.en)
  }

  const startScenario = (key: string) => {
    const scenario = SCENARIOS[key]
    const scenarioParts = getParts(scenario, key)
    sessionTopics.current = pickTopics()
    turnsTarget.current = pickTurnsTarget()
    setSelectedKey(key)
    setParts(scenarioParts)
    setPartIndex(0)
    setTurnInPart(0)
    setInputValue("")
    setLastTranscript(null)
    setLastFeedback(null)
    setLastUserLine(null)
    setFeedbackTab("grammar")
    setError(null)

    const firstScenario = SCENARIOS[scenarioParts[0].scenarioKey]
    const line = pickRandom(firstScenario.openingLines)
    askedQuestions.current = [line.en]
    setDialogue([{ type: "bubble", who: firstScenario.who, line: line.en, fr: line.fr, isUser: false }])
    setTimeout(() => speak(line.en), 300)
  }

  const backToScenarios = () => {
    setSelectedKey(null)
    setDialogue([])
    setParts([])
  }

  const submit = async () => {
    if (!activeScenario || !inputValue.trim() || loading) return
    const userLine = inputValue.trim()
    setLoading(true)
    setError(null)
    setLastFeedback(null)

    const lastCharacterLine =
      [...dialogue]
        .reverse()
        .find((d): d is Extract<DialogueEntry, { type: "bubble" }> => d.type === "bubble" && !d.isUser)?.line ||
      askedQuestions.current[0] ||
      ""

    const topicsContext = sessionTopics.current.length
      ? ` Sujets à garder en fil rouge pour cette session (contexte pour toi, ne les lis jamais mot pour mot au joueur) : ${sessionTopics.current.join(" · ")}.`
      : ""

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "roleplay",
          targetPhrase: lastCharacterLine,
          userAnswer: userLine,
          context: activeScenario.context + topicsContext,
          history: askedQuestions.current,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: RoleplayCoachResponse = await res.json()

      setDialogue((d) => [...d, { type: "bubble", who: "Toi", line: userLine, isUser: true }])
      setLastFeedback({ coherent: data.coherent, suggestion_fr: data.suggestion_fr })
      setLastUserLine(userLine)
      setFeedbackTab("grammar")
      setInputValue("")
      setLastTranscript(null)

      const nextTurn = turnInPart + 1

      if (nextTurn < turnsTarget.current && data.next_question_en) {
        askedQuestions.current = [data.next_question_en, ...askedQuestions.current].slice(0, 10)
        setDialogue((d) => [
          ...d,
          { type: "bubble", who: activeScenario.who, line: data.next_question_en, fr: data.next_question_fr, isUser: false },
        ])
        speak(data.next_question_en)
        setTurnInPart(nextTurn)
      } else {
        const nextPartIndex = partIndex + 1
        setTurnInPart(0)
        if (nextPartIndex < parts.length) {
          const nextPart = parts[nextPartIndex]
          const nextScenario = SCENARIOS[nextPart.scenarioKey]
          setPartIndex(nextPartIndex)
          openPart(nextScenario, nextPart.transition)
        } else {
          setPartIndex(nextPartIndex)
        }
      }
    } catch (e) {
      console.error(e)
      setError("Le coach n'a pas pu répondre. Vérifie ta connexion et réessaie.")
    } finally {
      setLoading(false)
    }
  }

  if (!selectedKey) {
    return (
      <div>
        <div className={styles.muted} style={{ marginBottom: 14 }}>
          Choisis une simulation. Le personnage te parle à voix haute (🔊), tu réponds à l'écrit ou au micro.
        </div>
        <div className={styles.scenarioGrid}>
          {Object.entries(SCENARIOS).map(([key, s]) => (
            <button key={key} type="button" className={styles.scenarioCard} onClick={() => startScenario(key)}>
              <div className={styles.scenarioIcon}>{s.icon}</div>
              <div className={styles.scenarioTitle}>{s.title}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const scenarioTitle = SCENARIOS[selectedKey].title

  return (
    <div>
      <div className={styles.badge}>{scenarioTitle}</div>
      <div className={styles.dialogue} style={{ marginTop: 14 }}>
        {dialogue.map((entry, i) =>
          entry.type === "transition" ? (
            <div key={i} className={`${styles.muted} ${styles.mono}`} style={{ textAlign: "center", fontSize: 12 }}>
              — {entry.text} —
            </div>
          ) : (
            <div key={i} className={`${styles.bubble} ${entry.isUser ? styles.bubbleMe : styles.bubbleThem}`}>
              <div className={styles.bubbleWho}>
                {entry.who}
                {!entry.isUser && " 🔊"}
              </div>
              {entry.isUser ? entry.line : <HoverWord fr={entry.fr || ""}>{entry.line}</HoverWord>}
            </div>
          ),
        )}

        {lastFeedback && (
          <div>
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
              <div className={`${styles.feedback} ${lastFeedback.coherent ? styles.feedbackOk : styles.feedbackNo}`}>
                💡 {lastFeedback.suggestion_fr}
              </div>
            ) : (
              <div className={styles.pronPanel}>
                <PronunciationCheck referenceText={lastUserLine || ""} />
              </div>
            )}
          </div>
        )}

        {error && <div className={styles.errorText}>{error}</div>}

        {!finished ? (
          <>
            <div className={styles.rowLeft}>
              <input
                ref={inputRef}
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
                {loading ? "Analyse..." : "Envoyer"}
              </button>
              <button
                className={styles.action}
                onClick={() => {
                  const lastBubble = [...dialogue]
                    .reverse()
                    .find((d): d is Extract<DialogueEntry, { type: "bubble" }> => d.type === "bubble" && !d.isUser)
                  if (lastBubble) speak(lastBubble.line)
                }}
              >
                🔊 Réécouter
              </button>
            </div>
            {lastTranscript && (
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
