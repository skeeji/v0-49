"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
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
  const anchorRef = useRef<HTMLSpanElement>(null)
  const bubbleRef = useRef<HTMLSpanElement>(null)
  // Position calculée en coordonnées écran (position: fixed), pour ne jamais
  // dépendre du bord de l'ancre : par défaut la bulle est centrée sur le mot,
  // mais un mot proche du bord gauche/droit/haut de l'écran (fréquent en
  // roleplay/appel où les bulles de dialogue collent parfois au bord) la
  // faisait déborder hors du viewport et couper le texte. On mesure la bulle
  // une fois affichée et on recale sa position pour qu'elle reste toujours
  // entièrement visible.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!show || !anchorRef.current || !bubbleRef.current) {
      setPos(null)
      return
    }
    const margin = 8
    const anchorRect = anchorRef.current.getBoundingClientRect()
    const bubbleRect = bubbleRef.current.getBoundingClientRect()

    let left = anchorRect.left + anchorRect.width / 2 - bubbleRect.width / 2
    left = Math.min(Math.max(left, margin), window.innerWidth - bubbleRect.width - margin)

    let top = anchorRect.top - bubbleRect.height - 6
    // Pas assez de place au-dessus (mot tout en haut de l'écran) : on bascule en dessous.
    if (top < margin) top = anchorRect.bottom + 6

    setPos({ top, left })
  }, [show])

  return (
    <span
      ref={anchorRef}
      className={styles.hoverWord}
      tabIndex={0}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      onClick={() => setShow((s) => !s)}
    >
      {children}
      {show && fr && (
        <span
          ref={bubbleRef}
          className={styles.hoverWordBubble}
          style={pos ? { top: pos.top, left: pos.left, visibility: "visible" } : { top: 0, left: 0, visibility: "hidden" }}
        >
          {fr}
        </span>
      )}
    </span>
  )
}
