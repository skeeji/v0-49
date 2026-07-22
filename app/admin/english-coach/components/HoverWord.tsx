"use client"

import { useState, type ReactNode } from "react"
import styles from "../coach.module.css"

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
      {show && fr && <span className={styles.hoverWordBubble}>{fr}</span>}
    </span>
  )
}
