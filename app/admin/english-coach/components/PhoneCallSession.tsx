"use client"

import { useEffect, useRef, useState } from "react"
import styles from "../coach.module.css"
import { SCENARIOS } from "../data"
import { useSpeechRecognition, speak, cancelSpeech } from "../hooks/useSpeech"
import { HoverWord } from "./HoverWord"
import type { PhoneCallCoachResponse, Scenario } from "../types"

const CALLABLE_SCENARIOS = ["customs", "electrician", "manager"]

interface LogEntry {
  isUser: boolean
  line: string
  fr?: string
  correction_fr?: string | null
}

export function PhoneCallSession() {
  const [scenarioKey, setScenarioKey] = useState<string | null>(null)
  const [callActive, setCallActive] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [fallbackText, setFallbackText] = useState("")
  const askedQuestions = useRef<string[]>([])
  const lastQuestion = useRef<string>("")
  const callActiveRef = useRef(false)
  // Ref (et non simple const dérivée du render) car startCall() enchaîne de façon
  // synchrone sur askNext() -> speak() -> listenForAnswer() -> handleAnswer avant
  // que React n'ait eu l'occasion de re-render avec le nouveau scenarioKey : une
  // closure basée sur le state aurait encore vu l'ancien scenario (null) au tout
  // premier tour et ignorait la réponse de l'utilisateur.
  const activeScenarioRef = useRef<Scenario | null>(null)
  const dialogueRef = useRef<HTMLDivElement>(null)

  const { listening, error: micError, supported: micSupported, startListening, stopListening } =
    useSpeechRecognition()

  const noResultRetries = useRef(0)

  // Auto-scroll fluide du journal de dialogue à chaque nouvelle bulle ou
  // correction ajoutée, pour garder le dernier échange visible sans action
  // manuelle de l'utilisateur.
  useEffect(() => {
    dialogueRef.current?.scrollTo({ top: dialogueRef.current.scrollHeight, behavior: "smooth" })
  }, [log])

  // Démarre l'écoute et, si la reconnaissance se termine sans résultat ni erreur
  // (silence non capté — cas observé en test), relance automatiquement une fois
  // avant de laisser l'utilisateur reprendre la main via le bouton manuel.
  const listenForAnswer = () => {
    startListening(
      (transcript) => {
        noResultRetries.current = 0
        handleAnswer(transcript)
      },
      () => {
        if (!callActiveRef.current) return
        if (noResultRetries.current < 1) {
          noResultRetries.current += 1
          console.log("[phone-call] 🔁 Aucun résultat — relance automatique de l'écoute")
          listenForAnswer()
        } else {
          console.warn("[phone-call] ⚠ Toujours aucun résultat après relance auto — bouton manuel disponible")
          noResultRetries.current = 0
        }
      },
    )
  }

  const askNext = (question: string, questionFr?: string, perfMark?: number) => {
    console.log(`[phone-call] askNext("${question}") — callActive=${callActiveRef.current}`)
    lastQuestion.current = question
    setLog((l) => [...l, { isUser: false, line: question, fr: questionFr }])
    setSpeaking(true)
    const voice = activeScenarioRef.current?.voice || "en-GB-SoniaNeural"
    speak(
      question,
      voice,
      () => {
        console.log(`[phone-call] speak() onEnd reçu — callActive=${callActiveRef.current}`)
        setSpeaking(false)
        if (!callActiveRef.current) {
          console.log("[phone-call] appel raccroché entre-temps, on n'active pas le micro")
          return
        }
        listenForAnswer()
      },
      perfMark,
    )
  }

  const retryListening = () => {
    console.log("[phone-call] 🎤 Réessayer l'écoute (manuel)")
    noResultRetries.current = 0
    listenForAnswer()
  }

  const startCall = (key: string) => {
    console.log(`[phone-call] startCall("${key}") — micSupported=${micSupported}`)
    if (!micSupported) {
      setError("Ce mode nécessite un micro compatible (Chrome/Edge, sur une connexion HTTPS).")
      return
    }
    const sc = SCENARIOS[key]
    activeScenarioRef.current = sc
    setScenarioKey(key)
    setCallActive(true)
    callActiveRef.current = true
    setLog([])
    setRevealed(new Set())
    setFallbackText("")
    setError(null)
    const opening = sc.openingLines[Math.floor(Math.random() * sc.openingLines.length)]
    askedQuestions.current = [opening.en]
    askNext(opening.en, opening.fr)
  }

  const handleAnswer = async (transcript: string) => {
    console.log(`[phone-call] handleAnswer("${transcript}")`)
    const activeScenario = activeScenarioRef.current
    if (!activeScenario || !callActiveRef.current) {
      console.log("[phone-call] handleAnswer ignoré (pas de scénario actif ou appel raccroché)")
      return
    }
    setLog((l) => [...l, { isUser: true, line: transcript }])
    setLoading(true)
    setError(null)

    // Mesure de latence bout-en-bout : de l'envoi de la réponse jusqu'au début
    // de la voix du correspondant (voir speak() dans useSpeech.ts pour la suite).
    const t0 = performance.now()
    try {
      console.log("[phone-call] POST /api/coach mode=phone_call —", {
        targetPhrase: lastQuestion.current,
        userAnswer: transcript,
      })
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "phone_call",
          targetPhrase: lastQuestion.current,
          userAnswer: transcript,
          context: activeScenario.context,
          history: askedQuestions.current,
        }),
      })
      console.log(`[phone-call] Réponse HTTP ${res.status} — ⏱ ${Math.round(performance.now() - t0)}ms`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: PhoneCallCoachResponse = await res.json()
      console.log("[phone-call] Données reçues —", data)

      if (!callActiveRef.current) {
        console.log("[phone-call] appel raccroché avant réception de la réponse, on ignore")
        return
      }

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
        askNext(data.next_question_en, data.next_question_fr, t0)
      } else {
        // Ne devrait plus arriver (le serveur garantit next_question_en non-vide),
        // mais on ne laisse jamais l'appel se bloquer silencieusement.
        console.error("[phone-call] ❌ next_question_en vide malgré la garantie serveur")
        setError("Le coach n'a pas pu relancer la conversation, réessaie ou raccroche.")
      }
    } catch (e) {
      console.error("[phone-call] ❌ Erreur handleAnswer —", e)
      setError("Le coach n'a pas pu répondre. Vérifie ta connexion.")
      setLoading(false)
    }
  }

  // Saisie de secours : utilisable à tout moment pendant l'appel (bruit de
  // chantier, micro capricieux) sans raccrocher ni relancer l'appel. On coupe
  // l'écoute en cours pour éviter qu'une réponse vocale tardive et la réponse
  // tapée n'arrivent en double.
  const submitFallbackText = () => {
    const text = fallbackText.trim()
    if (!text || !callActiveRef.current || loading) return
    stopListening()
    setFallbackText("")
    handleAnswer(text)
  }

  const toggleReveal = (index: number) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const hangUp = () => {
    console.log("[phone-call] 📴 hangUp()")
    callActiveRef.current = false
    setCallActive(false)
    setSpeaking(false)
    stopListening()
    cancelSpeech()
  }

  const backToPicker = () => {
    activeScenarioRef.current = null
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

  const statusLabel = loading
    ? "Analyse de ta réponse..."
    : listening
      ? "Écoute en cours..."
      : speaking
        ? "Le correspondant parle..."
        : "Connexion..."

  return (
    <div className={styles.phoneFullscreen}>
      <div className={styles.phoneTopBar}>
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

      <div className={styles.phonePulseWrap}>
        <div className={`${styles.phonePulseCircle} ${speaking ? styles.phonePulseCircleActive : ""}`} />
        {callActive && <div className={styles.phoneStatusLabel}>{statusLabel}</div>}
      </div>

      <div className={styles.phoneDialogueLog} ref={dialogueRef}>
        {log.map((entry, i) => {
          const isHiddenCorrespondentLine = !entry.isUser && !revealed.has(i)
          return (
            <div key={i}>
              <div className={`${styles.bubble} ${entry.isUser ? styles.bubbleMe : styles.bubbleThem}`}>
                <div className={styles.bubbleWho}>{entry.isUser ? "Toi" : "🔊 Correspondant"}</div>
                {isHiddenCorrespondentLine ? (
                  <>
                    <div className={styles.phoneHiddenLine}>Écoute la voix — texte masqué pour forcer l'écoute active.</div>
                    <button className={`${styles.resetLink} ${styles.phoneRevealBtn}`} onClick={() => toggleReveal(i)}>
                      Afficher le texte
                    </button>
                  </>
                ) : (
                  <>
                    {entry.isUser ? entry.line : <HoverWord fr={entry.fr || ""}>{entry.line}</HoverWord>}
                    {!entry.isUser && (
                      <button className={`${styles.resetLink} ${styles.phoneRevealBtn}`} onClick={() => toggleReveal(i)}>
                        Masquer le texte
                      </button>
                    )}
                  </>
                )}
              </div>
              {entry.correction_fr && (
                <div className={`${styles.feedback} ${styles.feedbackNo}`} style={{ marginTop: 4 }}>
                  💬 {entry.correction_fr}
                </div>
              )}
            </div>
          )
        })}

        {callActive && !loading && !listening && !speaking && (
          <div className={styles.row}>
            <button className={`${styles.action} ${styles.primary}`} onClick={retryListening}>
              🎤 Le micro ne s'est pas relancé — réessayer
            </button>
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

      {callActive && (
        <div className={styles.phoneBottomBar}>
          <div className={styles.phoneFallbackRow}>
            <input
              type="text"
              className={`${styles.input} ${styles.phoneFallbackInput}`}
              placeholder="Micro capricieux ? Tape ta réponse ici..."
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitFallbackText()
              }}
              disabled={loading}
            />
            <button className={styles.action} onClick={submitFallbackText} disabled={loading || !fallbackText.trim()}>
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
