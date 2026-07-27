"use client"

import { useEffect, useState } from "react"
import { RoleGuard } from "@/components/RoleGuard"
import styles from "./coach.module.css"
import { DEFAULT_WORDS } from "./data"
import { FlashcardSession } from "./components/FlashcardSession"
import { RoleplaySession } from "./components/RoleplaySession"
import { PhoneCallSession } from "./components/PhoneCallSession"
import { Dictionary } from "./components/Dictionary"
import { ProgressDashboard } from "./components/ProgressDashboard"
import { MusicSession } from "./components/MusicSession"
import type { ProgressRow, Word } from "./types"

const TARGET_DATE = new Date("2026-08-20T00:00:00")

type Tab = "flash" | "role" | "phone" | "dico" | "music" | "progress"

function daysLeft(): number {
  const diff = TARGET_DATE.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function CoachApp() {
  const [words, setWords] = useState<Word[]>(DEFAULT_WORDS)
  const [tab, setTab] = useState<Tab>("flash")
  const [sessions, setSessions] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/progress")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled || !data.success) return
        const byId = new Map<string, ProgressRow>(data.progress.map((p: ProgressRow) => [p.word_id, p]))
        setWords((prev) =>
          prev.map((w) => {
            const saved = byId.get(w.id)
            return saved
              ? { ...w, mastery: saved.mastery, wrong: saved.wrong_count, timesShown: saved.times_shown }
              : w
          }),
        )
      } catch (e) {
        console.error("Erreur chargement progression:", e)
      } finally {
        if (!cancelled) setLoadingProgress(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleUpdateWord = (wordId: string, mastery: number, wrong: number) => {
    setWords((prev) => {
      const updated = prev.map((w) => (w.id === wordId ? { ...w, mastery, wrong } : w))
      const w = updated.find((x) => x.id === wordId)
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word_id: wordId, mastery, wrong_count: wrong, times_shown: w?.timesShown ?? 0 }),
      }).catch((e) => console.error("Erreur sauvegarde progression:", e))
      return updated
    })
  }

  // Incrémente le compteur d'apparitions d'un mot (répondu ou passé) — sert à
  // garantir que chaque mot du pool ressorte au moins une fois avant qu'un mot
  // déjà vu ne remonte une seconde fois (voir buildQueue dans FlashcardSession).
  const handleWordShown = (wordId: string) => {
    setWords((prev) => {
      const updated = prev.map((w) => (w.id === wordId ? { ...w, timesShown: (w.timesShown ?? 0) + 1 } : w))
      const w = updated.find((x) => x.id === wordId)
      if (w) {
        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word_id: wordId,
            mastery: w.mastery,
            wrong_count: w.wrong,
            times_shown: w.timesShown ?? 0,
          }),
        }).catch((e) => console.error("Erreur sauvegarde progression:", e))
      }
      return updated
    })
  }

  const handleAddWord = (word: Word) => {
    setWords((prev) => [...prev, word])
  }

  const handleReset = () => {
    setWords(DEFAULT_WORDS.map((w) => ({ ...w })))
    setSessions(0)
    fetch("/api/progress", { method: "DELETE" }).catch((e) => console.error("Erreur reset progression:", e))
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "flash", label: "Flashcards" },
    { key: "role", label: "Jeu de rôle" },
    { key: "phone", label: "Appel" },
    { key: "dico", label: "Dictionnaire" },
    { key: "music", label: "Musique" },
    { key: "progress", label: "Progression" },
  ]

  return (
    <div className={styles.app}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.eyebrow}>Coach terrain — Boutique Dubaï</div>
            <h1 className={styles.title}>Dubai Coach</h1>
          </div>
          <div className={styles.countdown}>
            <div className={styles.countdownNum}>J-{daysLeft()}</div>
            <div className={styles.countdownLbl}>avant ouverture</div>
          </div>
        </header>
        <div className={styles.busLine} />

        <nav className={styles.tabs}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`${styles.tabButton} ${tab === t.key ? styles.tabButtonActive : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className={styles.panel}>
          {loadingProgress ? (
            <div className={styles.loading}>Chargement de ta progression…</div>
          ) : (
            <>
              {tab === "flash" && (
                <FlashcardSession
                  words={words}
                  onUpdateWord={handleUpdateWord}
                  onWordShown={handleWordShown}
                  onSessionTick={() => setSessions((s) => s + 1)}
                />
              )}
              {tab === "role" && <RoleplaySession />}
              {tab === "phone" && <PhoneCallSession />}
              {tab === "dico" && <Dictionary words={words} onAddWord={handleAddWord} />}
              {tab === "music" && <MusicSession words={words} />}
              {tab === "progress" && (
                <ProgressDashboard words={words} sessions={sessions} daysLeft={daysLeft()} onReset={handleReset} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EnglishCoachPage() {
  return (
    <RoleGuard requiredRole="admin">
      <CoachApp />
    </RoleGuard>
  )
}
