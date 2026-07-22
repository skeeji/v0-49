"use client"

import { useMemo, useState } from "react"
import styles from "../coach.module.css"
import { CAT_LABELS } from "../data"
import { HoverWord } from "./HoverWord"
import type { Word, WordCategory } from "../types"

interface DictionaryProps {
  words: Word[]
  onAddWord: (word: Word) => void
}

function WordRow({ word }: { word: Word }) {
  return (
    <div className={styles.wordItem}>
      <div>
        <div className={styles.wordItemFr}>{word.fr}</div>
        <div className={`${styles.wordItemEn} ${styles.display}`}>
          <HoverWord fr={word.fr}>{word.en}</HoverWord>
        </div>
        <div className={`${styles.wordItemTip} ${styles.mono}`}>{word.tip}</div>
      </div>
      <div className={styles.masteryBar}>
        <div className={styles.masteryFill} style={{ width: `${(word.mastery / 5) * 100}%` }} />
      </div>
    </div>
  )
}

export function Dictionary({ words, onAddWord }: DictionaryProps) {
  const [fullView, setFullView] = useState(false)
  const [query, setQuery] = useState("")
  const [fr, setFr] = useState("")
  const [en, setEn] = useState("")
  const [cat, setCat] = useState<WordCategory>("OPT")
  const [tip, setTip] = useState("")

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return words.filter((w) => w.fr.toLowerCase().includes(q) || w.en.toLowerCase().includes(q))
  }, [words, query])

  const byCategory = useMemo(() => {
    const groups: Record<string, Word[]> = {}
    words.forEach((w) => {
      groups[w.cat] = groups[w.cat] || []
      groups[w.cat].push(w)
    })
    Object.values(groups).forEach((list) => list.sort((a, b) => a.fr.localeCompare(b.fr)))
    return groups
  }, [words])

  const addWord = () => {
    if (!fr.trim() || !en.trim()) return
    onAddWord({
      id: `custom-${Date.now()}`,
      fr: fr.trim(),
      en: en.trim(),
      tip: tip.trim() || "—",
      cat,
      mastery: 0,
      wrong: 0,
    })
    setFr("")
    setEn("")
    setTip("")
  }

  return (
    <div>
      <div className={styles.rowLeft} style={{ marginBottom: 12 }}>
        <button className={`${styles.action} ${!fullView ? styles.primary : ""}`} onClick={() => setFullView(false)}>
          Recherche
        </button>
        <button className={`${styles.action} ${fullView ? styles.primary : ""}`} onClick={() => setFullView(true)}>
          Liste complète ({words.length} mots)
        </button>
      </div>

      {fullView ? (
        <div>
          {(Object.keys(CAT_LABELS) as WordCategory[]).map((c) => {
            const list = byCategory[c] || []
            if (!list.length) return null
            return (
              <div key={c} className={styles.catGroup}>
                <div className={`${styles.badge} ${styles.catGroupHeader}`}>
                  {CAT_LABELS[c]} ({list.length})
                </div>
                <div className={`${styles.wordList} ${styles.wordListFull}`}>
                  {list.map((w) => (
                    <WordRow key={w.id} word={w} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div className={styles.searchWrap}>
            <input
              type="text"
              className={styles.input}
              placeholder="Tape un mot en français ou en anglais..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.wordList}>
            {filtered.length ? (
              filtered.map((w) => <WordRow key={w.id} word={w} />)
            ) : (
              <div className={styles.muted}>Aucun résultat.</div>
            )}
          </div>
        </>
      )}

      <div className={styles.addForm}>
        <input
          type="text"
          className={`${styles.input} ${styles.addFormFull}`}
          placeholder="Terme français"
          value={fr}
          onChange={(e) => setFr(e.target.value)}
        />
        <input
          type="text"
          className={styles.input}
          placeholder="English term"
          value={en}
          onChange={(e) => setEn(e.target.value)}
        />
        <select className={styles.select} value={cat} onChange={(e) => setCat(e.target.value as WordCategory)}>
          {(Object.keys(CAT_LABELS) as WordCategory[]).map((c) => (
            <option key={c} value={c}>
              {CAT_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          type="text"
          className={`${styles.input} ${styles.addFormFull}`}
          placeholder="Prononciation (optionnel)"
          value={tip}
          onChange={(e) => setTip(e.target.value)}
        />
        <button className={`${styles.action} ${styles.primary} ${styles.addFormFull}`} onClick={addWord}>
          + Ajouter au dictionnaire
        </button>
      </div>
    </div>
  )
}
