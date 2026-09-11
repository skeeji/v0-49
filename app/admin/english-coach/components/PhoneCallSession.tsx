"use client"

import { useEffect, useRef, useState } from "react"
import styles from "../coach.module.css"
import { SCENARIOS, ROLEPLAY_TOPICS } from "../data"
import { useSpeechRecognition, speak, cancelSpeech } from "../hooks/useSpeech"
import { useCallHistory, type CallHistoryLine } from "../hooks/useCallHistory"
import { HoverWord } from "./HoverWord"
import type { PhoneCallCoachResponse, Scenario, ScenarioPart } from "../types"

// "full_day" enchaîne douane → électricien → manager en un seul appel continu,
// comme le "Parcours complet (Jour J-2)" du roleplay (voir SCENARIOS.full_day).
const CALLABLE_SCENARIOS = ["customs", "electrician", "manager", "manager_checkin", "full_day"]

// Même tirage que le roleplay (voir RoleplaySession.pickTopics) : sans lui,
// l'appel n'avait que le `context` figé du scénario comme boussole — ce qui
// pour l'électricien ("DALI lighting commissioning") ramenait la conversation
// vers le DALI bien plus souvent que voulu (~20% cible, voir data.ts).
function pickTopics(): string[] {
  const shuffled = [...ROLEPLAY_TOPICS].sort(() => Math.random() - 0.5)
  const count = 1 + Math.floor(Math.random() * 3)
  return shuffled.slice(0, count)
}

// Comme pickTurnsTarget() dans RoleplaySession : une "partie" (ex: l'électricien
// au sein du parcours complet) dure entre 5 et 8 tours avant de passer à la suivante.
function pickTurnsTarget(): number {
  return 5 + Math.floor(Math.random() * 4)
}

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function getParts(scenario: Scenario, key: string): ScenarioPart[] {
  return scenario.parts && scenario.parts.length ? scenario.parts : [{ scenarioKey: key }]
}

type LogEntry =
  | { type: "bubble"; isUser: boolean; line: string; fr?: string; correction_fr?: string | null; who?: string; voice?: string }
  | { type: "transition"; text: string }

export function PhoneCallSession() {
  const [scenarioKey, setScenarioKey] = useState<string | null>(null)
  const [callActive, setCallActive] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [fallbackText, setFallbackText] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null)
  const { history, saveCall, removeCall } = useCallHistory()
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
  const sessionTopics = useRef<string[]>([])
  // Refs (pas de state) pour les mêmes raisons que activeScenarioRef ci-dessus :
  // ces valeurs doivent être lues à jour dans des closures async profondes
  // (askNext -> speak -> listenForAnswer -> handleAnswer) qui peuvent s'exécuter
  // avant qu'un re-render n'ait eu lieu.
  const partsRef = useRef<ScenarioPart[]>([])
  const partIndexRef = useRef(0)
  const turnInPartRef = useRef(0)
  const turnsTargetRef = useRef<number>(pickTurnsTarget())
  // Miroir de `log` lisible de façon synchrone dans hangUp()/advanceToNextPart()
  // (même raison que les autres refs ci-dessus : ces fonctions peuvent capturer
  // une closure plus ancienne que le dernier setLog()).
  const logRef = useRef<LogEntry[]>([])

  const { listening, micReady, error: micError, supported: micSupported, startListening, stopListening, prewarm } =
    useSpeechRecognition()

  const noResultRetries = useRef(0)

  // Auto-scroll fluide du journal de dialogue à chaque nouvelle bulle ou
  // correction ajoutée, pour garder le dernier échange visible sans action
  // manuelle de l'utilisateur.
  useEffect(() => {
    dialogueRef.current?.scrollTo({ top: dialogueRef.current.scrollHeight, behavior: "smooth" })
  }, [log])

  useEffect(() => {
    logRef.current = log
  }, [log])

  // Sauvegarde l'appel en cours dans l'historique (voir useCallHistory) — appelé
  // à la fois sur raccroché manuel (hangUp) et en fin naturelle d'un parcours
  // multi-parties (advanceToNextPart). Ignore les bulles de transition, non
  // pertinentes à rejouer.
  const saveCurrentCallToHistory = () => {
    if (!scenarioKey) return
    const lines: CallHistoryLine[] = logRef.current
      .filter((e): e is Extract<LogEntry, { type: "bubble" }> => e.type === "bubble")
      .map((e) => ({ isUser: e.isUser, line: e.line, fr: e.fr, who: e.who, voice: e.voice }))
    saveCall(SCENARIOS[scenarioKey].title, lines)
  }

  // Libère le micro si l'utilisateur quitte l'écran d'appel en cours de
  // pré-chauffage ou d'écoute (ex : navigation ailleurs sans raccrocher).
  useEffect(() => stopListening, [stopListening])

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
    setLog((l) => [
      ...l,
      { type: "bubble", isUser: false, line: question, fr: questionFr, who: activeScenarioRef.current?.who, voice: activeScenarioRef.current?.voice },
    ])
    setSpeaking(true)
    // Réchauffe la reconnaissance vocale dès le début de la question posée à
    // voix haute : le temps que speak() joue l'audio (plusieurs secondes)
    // laisse largement au moteur de reconnaissance le temps de s'initialiser,
    // pour que listenForAnswer() (déclenché juste après, à la fin de la
    // question) démarre avec un micro déjà actif — au lieu de perdre les
    // premiers mots de la réponse pendant que le micro finit de démarrer.
    prewarm()
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
    const scenarioParts = getParts(sc, key)
    const firstScenario = SCENARIOS[scenarioParts[0].scenarioKey]
    partsRef.current = scenarioParts
    partIndexRef.current = 0
    turnInPartRef.current = 0
    turnsTargetRef.current = pickTurnsTarget()
    activeScenarioRef.current = firstScenario
    sessionTopics.current = pickTopics()
    setScenarioKey(key)
    setCallActive(true)
    callActiveRef.current = true
    setLog([])
    setRevealed(new Set())
    setFallbackText("")
    setError(null)
    const opening = pickRandom(firstScenario.openingLines)
    askedQuestions.current = [opening.en]
    askNext(opening.en, opening.fr)
  }

  // Fait passer l'appel à la partie suivante du parcours (ex: électricien après
  // la douane) : nouveau scénario actif, nouveaux sujets, bannière de transition
  // dans le journal, puis une nouvelle réplique d'ouverture — jamais la suite de
  // la conversation précédente, pour marquer clairement le changement de contexte.
  const advanceToNextPart = () => {
    const nextPartIndex = partIndexRef.current + 1
    turnInPartRef.current = 0
    if (nextPartIndex >= partsRef.current.length) {
      partIndexRef.current = nextPartIndex
      callActiveRef.current = false
      setCallActive(false)
      setSpeaking(false)
      stopListening()
      saveCurrentCallToHistory()
      return
    }
    const nextPart = partsRef.current[nextPartIndex]
    const nextScenario = SCENARIOS[nextPart.scenarioKey]
    partIndexRef.current = nextPartIndex
    turnsTargetRef.current = pickTurnsTarget()
    sessionTopics.current = pickTopics()
    activeScenarioRef.current = nextScenario
    if (nextPart.transition) {
      setLog((l) => [...l, { type: "transition", text: nextPart.transition! }])
    }
    const opening = pickRandom(nextScenario.openingLines)
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
    setLog((l) => [...l, { type: "bubble", isUser: true, line: transcript }])
    setLoading(true)
    setError(null)

    // Mesure de latence bout-en-bout : de l'envoi de la réponse jusqu'au début
    // de la voix du correspondant (voir speak() dans useSpeech.ts pour la suite).
    const t0 = performance.now()
    try {
      const topicsContext = sessionTopics.current.length
        ? ` Sujets à garder en fil rouge pour cette session (contexte pour toi, ne les lis jamais mot pour mot au joueur) : ${sessionTopics.current.join(" · ")}.`
        : ""

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
          context: activeScenario.context + topicsContext,
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
          const lastEntry = copy[copy.length - 1]
          if (lastEntry?.type === "bubble") copy[copy.length - 1] = { ...lastEntry, correction_fr: data.correction_fr }
          return copy
        })
      }

      setLoading(false)

      // Parcours mono-scénario (douane / électricien / manager seuls) : appel
      // continu sans limite de tours, comportement inchangé.
      const isMultiPart = partsRef.current.length > 1
      if (!isMultiPart) {
        if (data.next_question_en) {
          askedQuestions.current = [data.next_question_en, ...askedQuestions.current].slice(0, 10)
          askNext(data.next_question_en, data.next_question_fr, t0)
        } else {
          // Ne devrait plus arriver (le serveur garantit next_question_en non-vide),
          // mais on ne laisse jamais l'appel se bloquer silencieusement.
          console.error("[phone-call] ❌ next_question_en vide malgré la garantie serveur")
          setError("Le coach n'a pas pu relancer la conversation, réessaie ou raccroche.")
        }
        return
      }

      // Parcours complet (full_day) : on compte les tours de la partie en
      // cours et on bascule sur la suivante (ou on termine l'appel) une fois
      // le quota de tours atteint — même logique que RoleplaySession.submit().
      const nextTurn = turnInPartRef.current + 1
      if (nextTurn < turnsTargetRef.current && data.next_question_en) {
        askedQuestions.current = [data.next_question_en, ...askedQuestions.current].slice(0, 10)
        askNext(data.next_question_en, data.next_question_fr, t0)
        turnInPartRef.current = nextTurn
      } else {
        advanceToNextPart()
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
    saveCurrentCallToHistory()
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

        <div className={styles.row} style={{ marginTop: 18 }}>
          <button className={styles.action} onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "▲ Masquer l'historique" : `📜 Historique des appels (${history.length})`}
          </button>
        </div>

        {showHistory && (
          <div className={styles.recapList} style={{ marginTop: 10 }}>
            {history.length === 0 && (
              <div className={styles.muted} style={{ fontSize: 13 }}>
                Aucun appel terminé pour l'instant.
              </div>
            )}
            {history.map((call) => {
              const isOpen = openHistoryId === call.id
              return (
                <div key={call.id} className={styles.recapItem}>
                  <div
                    className={styles.recapItemRow}
                    style={{ cursor: "pointer", justifyContent: "space-between" }}
                    onClick={() => setOpenHistoryId(isOpen ? null : call.id)}
                  >
                    <div>
                      <div className={styles.recapItemWord}>{call.scenarioTitle}</div>
                      <span className={styles.muted}>
                        {new Date(call.timestamp).toLocaleString("fr-FR")} — {call.lines.length} répliques
                      </span>
                    </div>
                    <span className={styles.muted}>{isOpen ? "▲" : "▼"}</span>
                  </div>

                  {isOpen && (
                    <>
                      <div className={styles.phoneDialogueLog} style={{ maxHeight: 260, marginTop: 8 }}>
                        {call.lines.map((l, i) => (
                          <div key={i} className={`${styles.bubble} ${l.isUser ? styles.bubbleMe : styles.bubbleThem}`}>
                            <div className={styles.bubbleWho}>{l.isUser ? "Toi" : l.who || "Correspondant"}</div>
                            {l.isUser ? l.line : <HoverWord fr={l.fr || ""}>{l.line}</HoverWord>}
                            {!l.isUser && l.voice && (
                              <button
                                className={`${styles.resetLink} ${styles.phoneRevealBtn}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  speak(l.line, l.voice!)
                                }}
                              >
                                🔊 Réécouter
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className={styles.row} style={{ marginTop: 8 }}>
                        <button
                          className={styles.action}
                          onClick={(e) => {
                            e.stopPropagation()
                            removeCall(call.id)
                            if (isOpen) setOpenHistoryId(null)
                          }}
                        >
                          🗑️ Supprimer cet appel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const statusLabel = loading
    ? "Analyse de ta réponse..."
    : listening
      ? micReady
        ? "🎤 Prêt, tu peux parler"
        : "Démarrage du micro..."
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
          if (entry.type === "transition") {
            return (
              <div key={i} className={`${styles.muted} ${styles.mono}`} style={{ textAlign: "center", fontSize: 12 }}>
                — {entry.text} —
              </div>
            )
          }
          const isHiddenCorrespondentLine = !entry.isUser && !revealed.has(i)
          return (
            <div key={i}>
              <div className={`${styles.bubble} ${entry.isUser ? styles.bubbleMe : styles.bubbleThem}`}>
                <div className={styles.bubbleWho}>{entry.isUser ? "Toi" : `🔊 ${entry.who || "Correspondant"}`}</div>
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
