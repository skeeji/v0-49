"use client"

import styles from "../coach.module.css"
import { CAT_LABELS } from "../data"
import type { Word, WordCategory } from "../types"

interface ProgressDashboardProps {
  words: Word[]
  sessions: number
  daysLeft: number
  onReset: () => void
}

export function ProgressDashboard({ words, sessions, daysLeft, onReset }: ProgressDashboardProps) {
  const total = words.length
  const mastered = words.filter((w) => w.mastery >= 4).length

  const categories = (Object.keys(CAT_LABELS) as WordCategory[]).map((c) => {
    const list = words.filter((w) => w.cat === c)
    const avg = list.length ? list.reduce((sum, w) => sum + w.mastery, 0) / list.length : 0
    return { cat: c, avg }
  })

  const weak = words
    .filter((w) => w.mastery <= 1 && w.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 10)

  const handleReset = () => {
    if (!window.confirm("Réinitialiser toute ta progression ? Cette action est irréversible.")) return
    onReset()
  }

  return (
    <div>
      <div className={styles.statRow}>
        <div className={styles.stat}>
          <div className={styles.statVal}>
            {mastered}/{total}
          </div>
          <div className={styles.statLbl}>mots maîtrisés</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>{sessions}</div>
          <div className={styles.statLbl}>cartes travaillées</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>J-{daysLeft}</div>
          <div className={styles.statLbl}>avant Dubaï</div>
        </div>
      </div>

      {categories.map(({ cat, avg }) => (
        <div key={cat} className={styles.catRow}>
          <div className={styles.catRowName}>{CAT_LABELS[cat]}</div>
          <div className={styles.catBar}>
            <div className={styles.catBarFill} style={{ width: `${(avg / 5) * 100}%` }} />
          </div>
        </div>
      ))}

      <div className={styles.badge} style={{ marginTop: 16 }}>
        Points faibles à retravailler
      </div>
      <div className={styles.weakList}>
        {weak.length ? (
          weak.map((w) => (
            <div key={w.id} className={styles.weakChip}>
              {w.en}
            </div>
          ))
        ) : (
          <span className={styles.muted}>Aucun point faible identifié pour l'instant.</span>
        )}
      </div>

      <button className={styles.resetLink} onClick={handleReset}>
        Réinitialiser toute la progression
      </button>
    </div>
  )
}
