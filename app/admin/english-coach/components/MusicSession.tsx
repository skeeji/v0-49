"use client"

import { useEffect, useMemo } from "react"
import styles from "../coach.module.css"
import { CAT_LABELS } from "../data"
import { SURVIVAL_PHRASES } from "../survival-data"
import { PRECISE_SITE_PHRASES } from "../precise-phrases-data"
import { NUMBER_PHRASES } from "../numbers-data"
import { LINKING_WORD_PHRASES } from "../linking-words-data"
import { PREPOSITION_PHRASES } from "../prepositions-data"
import { useVocabPlayer } from "../hooks/useVocabPlayer"
import { useBackgroundMusic } from "../hooks/useBackgroundMusic"
import { useFavorites } from "../hooks/useFavorites"
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

// Piste "phrases techniques précises" : réglages/lux/ambiances du chantier DIOR
// (Doha/Abu Dhabi), formulées mot pour mot plutôt qu'en vocabulaire générique —
// complémentaire de la piste Chantier & manager ci-dessus (voir precise-phrases-data.ts).
const PRECISE_SITE_MUSIC_PHRASES: MusicItem[] = PRECISE_SITE_PHRASES

// Pistes "Chiffres", "Linking words" et "Prépositions" : reprennent tel quel
// le phrasebook dédié de chaque mode Entraînement (numbers-data.ts,
// linking-words-data.ts, prepositions-data.ts) pour les réécouter en boucle,
// comme les autres thèmes ci-dessus.
const NUMBERS_MUSIC_PHRASES: MusicItem[] = NUMBER_PHRASES
const LINKING_WORDS_MUSIC_PHRASES: MusicItem[] = LINKING_WORD_PHRASES
const PREPOSITIONS_MUSIC_PHRASES: MusicItem[] = PREPOSITION_PHRASES

export function MusicSession({ words }: MusicSessionProps) {
  const { state, play, pause, resume } = useVocabPlayer()
  // Piste de fond Tone.js : totalement séparée du séquenceur de mots ci-dessus
  // (son propre Tone.Transport, aucun événement partagé) — seule MusicSession
  // les synchronise de l'extérieur, au niveau session (démarrage/pause/fin),
  // jamais au niveau mot à mot.
  const bgMusic = useBackgroundMusic()
  // Coeur -> Fiche mémo : favoris purement côté appareil (voir useFavorites),
  // indépendants de la progression/mastery des Flashcards.
  const { isFavorite, toggleFavorite } = useFavorites()

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
    const preciseSiteTheme: ThemeGroup = {
      code: "SITE_PRECISE",
      label: "Réglages précis chantier DIOR (lux, ambiances)",
      unit: "phrases",
      words: PRECISE_SITE_MUSIC_PHRASES,
    }
    const numbersTheme: ThemeGroup = {
      code: "NUMBERS",
      label: "Chiffres (lux, %, dimensions, heures...)",
      unit: "phrases",
      words: NUMBERS_MUSIC_PHRASES,
    }
    const linkingWordsTheme: ThemeGroup = {
      code: "LINKING_WORDS",
      label: "Linking words (connecteurs logiques)",
      unit: "phrases",
      words: LINKING_WORDS_MUSIC_PHRASES,
    }
    const prepositionsTheme: ThemeGroup = {
      code: "PREPOSITIONS",
      label: "Prépositions de lieu",
      unit: "phrases",
      words: PREPOSITIONS_MUSIC_PHRASES,
    }
    return [siteManagerTheme, preciseSiteTheme, numbersTheme, linkingWordsTheme, prepositionsTheme, ...vocabThemes]
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
              <button
                type="button"
                className={`${styles.heartBtn} ${isFavorite(currentWord.id) ? styles.heartBtnActive : ""}`}
                onClick={() => toggleFavorite(currentWord)}
                title={isFavorite(currentWord.id) ? "Retirer de la Fiche mémo" : "Ajouter à la Fiche mémo"}
                aria-label={isFavorite(currentWord.id) ? "Retirer de la Fiche mémo" : "Ajouter à la Fiche mémo"}
              >
                {isFavorite(currentWord.id) ? "❤️" : "🤍"}
              </button>
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
