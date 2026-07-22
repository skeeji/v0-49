"use client"

import { useState, type ReactNode } from "react"
import styles from "../coach.module.css"
import type { Word } from "../types"

interface HoverWordProps {
  fr: string
  children: ReactNode
}

// Bulle de traduction au survol (desktop) / au tap (mobile). Le tap mobile n'a
// pas de vrai "hover", donc onClick bascule l'affichage en plus de l'écoute
// souris/clavier, sans quoi la traduction serait inaccessible au tap.
export function HoverWord({ fr, children }: HoverWordProps) {
  const [show, setShow] = useState(false)

  return (
    <span
      className={styles.hoverWord}
      tabIndex={0}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      onClick={() => setShow((s) => !s)}
    >
      {children}
      {show && <span className={styles.hoverWordBubble}>{fr}</span>}
    </span>
  )
}

// Découpe un texte anglais dynamique (répliques de roleplay générées par l'IA)
// et enveloppe les segments qui correspondent à un mot/expression connu du
// dictionnaire dans un <HoverWord>, pour afficher sa traduction française sans
// appel API supplémentaire. Les mots les plus longs sont testés en premier pour
// que les expressions ("hot spot") priment sur leurs sous-mots ("hot").
export function renderWithHoverWords(text: string, words: Word[]): ReactNode[] {
  const known = [...words]
    .filter((w) => w.en.trim().length > 1)
    .sort((a, b) => b.en.length - a.en.length)

  if (!known.length) return [text]

  const pattern = known.map((w) => w.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  const re = new RegExp(`\\b(${pattern})\\b`, "gi")

  const result: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) result.push(text.slice(lastIndex, match.index))
    const matchedText = match[0]
    const wordDef = known.find((w) => w.en.toLowerCase() === matchedText.toLowerCase())
    result.push(
      <HoverWord key={`hw-${key++}`} fr={wordDef?.fr || matchedText}>
        {matchedText}
      </HoverWord>,
    )
    lastIndex = match.index + matchedText.length
  }
  if (lastIndex < text.length) result.push(text.slice(lastIndex))

  return result
}
