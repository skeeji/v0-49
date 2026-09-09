"use client"

import { useEffect, useMemo } from "react"
import styles from "../coach.module.css"
import { CAT_LABELS } from "../data"
import { SURVIVAL_PHRASES } from "../survival-data"
import { useVocabPlayer } from "../hooks/useVocabPlayer"
import { useBackgroundMusic } from "../hooks/useBackgroundMusic"
import type { Word, WordCategory } from "../types"

interface MusicSessionProps {
  words: Word[]
}

// Forme minimale utilisée par cette piste (id/fr/en/tip) — suffisante pour
// piloter le lecteur et l'affichage, satisfaite aussi bien par Word
// (data.ts) que par SurvivalPhrase (survival-data.ts).
interface MusicItem {
  id: string
  fr: string
  en: string
  tip: string
}

interface ThemeGroup {
  code: string
  label: string
  unit: string
  words: MusicItem[]
}

// Piste dédiée "chantier & manager" : reprend les phrases ELEC + MGR du
// phrasebook de survie (survival-data.ts, déjà réservées aux deux
// interlocuteurs les plus fréquents sur site) pour les écouter en boucle
// comme les autres thèmes, plutôt que de les retaper — largement au-dessus
// du minimum de 30 phrases utile visé ici.
const SITE_MANAGER_PHRASES: MusicItem[] = SURVIVAL_PHRASES.filter((p) => p.cat === "ELEC" || p.cat === "MGR")

export function MusicSession({ words }: MusicSessionProps) {
  const { state, play, pause, resume } = useVocabPlayer()
  // Piste de fond Tone.js : totalement séparée du séquenceur de mots ci-dessus
  // (son propre Tone.Transport, aucun événement partagé) — seule MusicSession
  // les synchronise de l'extérieur, au niveau session (démarrage/pause/fin),
  // jamais au niveau mot à mot.
  const bgMusic = useBackgroundMusic()

  const themes: ThemeGroup[] = useMemo(() => {
    const vocabThemes: ThemeGroup[] = (Object.keys(CAT_LABELS) as WordCategory[]).map((code) => ({
      code,
      label: CAT_LABELS[code],
      unit: "mots",
      words: words.filter((w) => w.cat === code),
    }))
    const siteManagerTheme: ThemeGroup = {
      code: "SITE_MGR",
      label: "Chantier & manager (phrases utiles)",
      unit: "phrases",
      words: SITE_MANAGER_PHRASES,
    }
    return [siteManagerTheme, ...vocabThemes]
  }, [words])

  const activeTheme = themes.find((t) => t.code === state.activeThemeId) || null
  // Mot actuellement entendu (fr ou en) — support visuel synchronisé à l'audio :
  // orthographe correcte + phonétique façon dictionnaire (le champ `tip`,
  // partagé avec le Dictionnaire et les flashcards), pour voir le mot en même
  // temps qu'on l'entend.
  const currentWord = activeTheme && activeTheme.words[state.index] ? activeTheme.words[state.index] : null

  const handlePlay = (theme: ThemeGroup) => {
    if (!theme.words.length) return
    play(
      theme.code,
      theme.words.map((w) => ({ id: w.id, fr: w.fr, en: w.en })),
    )
    if (bgMusic.enabled) bgMusic.start()
  }

  const handlePause = () => {
    pause()
    bgMusic.pause()
  }

  const handleResume = () => {
    resume()
    if (bgMusic.enabled) bgMusic.resume()
  }

  // Coupe la boucle de fond quand la session se termine ou échoue — la piste
  // de fond ne pilote jamais cette transition, elle ne fait que suivre l'état
  // global une fois qu'il a changé.
  useEffect(() => {
    if (state.status === "finished" || state.status === "error" || state.status === "idle") {
      bgMusic.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status])

  return (
    <div>
      <div className={styles.rowLeft} style={{ marginBottom: 16, justifyContent: "space-between" }}>
        <div className={styles.muted} style={{ fontSize: 13 }}>
          Écoute chaque thème mot par mot : français, puis anglais, en boucle jusqu'à la fin de la liste.
        </div>
        <button className={styles.action} onClick={bgMusic.toggleEnabled}>
          {bgMusic.enabled ? "🎵 Musique de fond : activée" : "🔇 Musique de fond : coupée"}
        </button>
      </div>

      <div className={styles.themeList}>
        {themes.map((theme) => {
          const isActive = theme.code === state.activeThemeId
          return (
            <div key={theme.code} className={`${styles.themeItem} ${isActive ? styles.themeItemActive : ""}`}>
              <div className={styles.themeItemHeader}>
                <div className={`${styles.themeItemTitle} ${styles.display}`}>{theme.label}</div>
                <div className={styles.badge}>{theme.words.length} {theme.unit}</div>
              </div>
              <button
                className={`${styles.action} ${styles.primary}`}
                onClick={() => handlePlay(theme)}
                disabled={!theme.words.length || (isActive && state.status === "preloading")}
              >
                {isActive && state.status === "preloading" ? "Préparation…" : "▶ Écouter"}
              </button>
            </div>
          )
        })}
      </div>

      {activeTheme && (
        <div className={styles.playerBar}>
          <div className={styles.playerBarTitle}>{activeTheme.label}</div>

          {state.status === "preloading" && (
            <>
              <div className={styles.catBar}>
                <div
                  className={styles.catBarFill}
                  style={{ width: `${state.preloadTotal ? (state.preloadDone / state.preloadTotal) * 100 : 0}%` }}
                />
              </div>
              <div className={styles.muted} style={{ fontSize: 12, marginTop: 6 }}>
                Préparation des clips audio… {state.preloadDone} / {state.preloadTotal}
              </div>
            </>
          )}

          {(state.status === "playing" || state.status === "paused") && currentWord && (
            <div className={styles.musicWordStage}>
              <div className={`${styles.musicWordFr} ${state.sub === "fr" ? styles.musicWordActive : ""}`}>{currentWord.fr}</div>
              <div className={`${styles.musicWordEn} ${styles.display} ${state.sub === "en" ? styles.musicWordActive : ""}`}>
                {currentWord.en}
              </div>
              <div className={`${styles.musicWordPhon} ${styles.mono}`}>{currentWord.tip}</div>
            </div>
          )}

          {(state.status === "playing" || state.status === "paused") && (
            <div className={styles.playerBarRow}>
              <button className={`${styles.action} ${styles.primary}`} onClick={state.status === "playing" ? handlePause : handleResume}>
                {state.status === "playing" ? "⏸ Pause" : "▶ Reprendre"}
              </button>
              <div className={styles.wordIndicator}>
                mot {Math.min(state.index + 1, state.total)} / {state.total}
              </div>
            </div>
          )}

          {state.status === "finished" && (
            <div className={styles.muted} style={{ fontSize: 13 }}>
              Thème terminé ✓ — {state.total}/{state.total} mots écoutés.
            </div>
          )}

          {state.status === "error" && state.error && <div className={styles.errorText}>{state.error}</div>}
        </div>
      )}
    </div>
  )
}
