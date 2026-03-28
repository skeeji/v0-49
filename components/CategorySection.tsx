"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface CategorySectionProps {
  luminaires:     any[]
  homepageImages: Record<string, string>
}

const CATEGORIES    = ["Lustre", "Applique", "Suspension", "Lampadaire", "Lampe", "Lanterne"]
const LABELS        = ["Lustres", "Appliques", "Suspensions", "Lampadaires", "Lampes", "Lanternes"]
const ANGLES_6      = [0, 45, 135, 180, 225, 315]
const START_OFFSETS = [120, 140, 130, 150, 110, 160]
const WIDTH_STARTS  = [160, 160, 160, 160, 160, 160]
const HEIGHT_STARTS = [240, 160, 112, 240, 160, 112]  // portrait / carré / paysage

const CREAM     = "#f5f1e8"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"

export function CategorySection({ luminaires, homepageImages }: CategorySectionProps) {
  const router = useRouter()

  const cardsRef       = useRef<(HTMLDivElement | null)[]>([])
  const cloneRefs      = useRef<(HTMLDivElement | null)[]>([])
  const destPagePos    = useRef<{ x: number; y: number; w: number; h: number }[]>([])
  const animFrameRef   = useRef<number>()
  const cardVisibleRef = useRef<boolean[]>(Array(6).fill(false))

  const [cardVisible, setCardVisible] = useState<boolean[]>(Array(6).fill(false))

  // Calcul des sources d'images (inline pour réactivité aux re-renders)
  const step    = luminaires.length > 0 ? Math.floor(luminaires.length / 6) : 0
  const imgSrcs = CATEGORIES.map((_, i) => {
    const override = homepageImages[`homepage_luminaire_${i}`]
    const pick     = step > 0 ? luminaires[i * step] : null
    return override || (pick?.filename ? `/api/images/filename/${pick.filename}` : null)
  })

  // Mesurer les positions absolues (page) des cases de destination
  useEffect(() => {
    const measure = () => {
      destPagePos.current = cardsRef.current.map(el => {
        if (!el) return { x: 0, y: 0, w: 0, h: 0 }
        const rect = el.getBoundingClientRect()
        return {
          x: rect.left + window.scrollX,
          y: rect.top  + window.scrollY,
          w: rect.width,
          h: rect.height,
        }
      })
    }
    const timer = setTimeout(measure, 150)
    window.addEventListener("resize", measure)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", measure)
    }
  }, [luminaires])

  // RAF scroll-driven : anime les clones vers leurs cases
  useEffect(() => {
    const update = () => {
      const scrollY  = window.scrollY
      const vh       = window.innerHeight
      const vw       = window.innerWidth
      const progress = Math.min(scrollY / vh, 1)

      ANGLES_6.forEach((angleDeg, i) => {
        const el = cloneRefs.current[i]
        if (!el) return

        const rad    = (angleDeg * Math.PI) / 180
        const offset = START_OFFSETS[i]
        const wStart = WIDTH_STARTS[i]
        const hStart = HEIGHT_STARTS[i]

        const leftStart = vw / 2 + Math.cos(rad) * offset - wStart / 2
        const topStart  = vh / 2 + Math.sin(rad) * offset - hStart / 2

        const dest = destPagePos.current[i]
        const hasDest = dest && dest.w > 0

        if (!hasDest) {
          // Pas encore mesuré : carte au repos en position FG
          el.style.display   = "block"
          el.style.transform = `translate(${leftStart}px, ${topStart}px)`
          el.style.width     = `${wStart}px`
          el.style.height    = `${hStart}px`
          el.style.opacity   = "0.9"
          return
        }

        // Smoothstep sur la plage de progress de cette carte
        const startP = i * 0.12
        const p      = Math.max(0, Math.min(1, (progress - startP) / 0.40))
        const ease   = p * p * (3 - 2 * p)

        if (ease >= 1) {
          el.style.display = "none"
          if (!cardVisibleRef.current[i]) {
            cardVisibleRef.current[i] = true
            setCardVisible(prev => { const n = [...prev]; n[i] = true; return n })
          }
        } else {
          // Viewport position de la destination (suit le scroll)
          const destLeft = dest.x - window.scrollX
          const destTop  = dest.y - window.scrollY

          const x  = leftStart + (destLeft - leftStart) * ease
          const y  = topStart  + (destTop  - topStart)  * ease
          const w  = wStart    + (dest.w   - wStart)    * ease
          const h  = hStart    + (dest.h   - hStart)    * ease
          const op = 0.90      + 0.10 * ease

          el.style.display   = "block"
          el.style.transform = `translate(${x}px, ${y}px)`
          el.style.width     = `${w}px`
          el.style.height    = `${h}px`
          el.style.opacity   = String(op)

          // Si on recule au-delà du seuil → cacher la vraie carte
          if (cardVisibleRef.current[i]) {
            cardVisibleRef.current[i] = false
            setCardVisible(prev => { const n = [...prev]; n[i] = false; return n })
          }
        }
      })

      animFrameRef.current = requestAnimationFrame(update)
    }

    animFrameRef.current = requestAnimationFrame(update)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [])

  return (
    <>
      <style>{`
        .cat-inner {
          height: 340px;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          background: #faf8f4;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        .cat-inner.ready {
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .cat-inner.ready:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.12);
        }
        .cat-inner img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          transition: transform 0.35s ease;
        }
        .cat-inner.ready:hover img { transform: scale(1.04); }
        .cat-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%);
          pointer-events: none;
        }
        .cat-label {
          position: absolute; bottom: 1rem; left: 1rem;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.3rem; font-weight: 600; color: #fff;
          text-shadow: 0 1px 6px rgba(0,0,0,0.4);
          pointer-events: none;
        }
        .cat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 767px) {
          .cat-grid  { grid-template-columns: repeat(2, 1fr); }
          .cat-inner { height: 220px; }
        }
        .cat-cta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: ${BROWN}; color: #fff;
          border-radius: 12px; font-weight: 500; font-size: 0.95rem;
          text-decoration: none; transition: background 0.2s;
        }
        .cat-cta:hover { background: #75614a; }
      `}</style>

      {/* ── Clones FIXED scroll-driven ── */}
      {CATEGORIES.map((cat, i) => (
        <div
          key={`clone-${cat}`}
          ref={el => { cloneRefs.current[i] = el }}
          style={{
            position:      "fixed",
            top:            0,
            left:           0,
            width:          `${WIDTH_STARTS[i]}px`,
            height:         `${HEIGHT_STARTS[i]}px`,
            borderRadius:   "14px",
            overflow:       "hidden",
            boxShadow:      "0 4px 20px rgba(0,0,0,0.06)",
            zIndex:         50,
            pointerEvents:  "none",
            willChange:     "transform, width, height, opacity",
            display:        "none",
          }}
        >
          {imgSrcs[i] && (
            <img
              src={imgSrcs[i]!}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
        </div>
      ))}

      <section style={{ background: CREAM, padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          {/* En-tête */}
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: BROWN,
                           textTransform: "uppercase", letterSpacing: "0.1em",
                           display: "block", marginBottom: "0.75rem" }}>
              Collection
            </span>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif',
                         fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 600,
                         color: TEXT_DARK, margin: "0 0 0.75rem" }}>
              Plus de {luminaires.length > 0 ? luminaires.length.toLocaleString("fr-FR") : "9 000"} luminaires
            </h2>
            <p style={{ fontSize: "1rem", color: TEXT_MID,
                        maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
              Explorez notre catalogue par catégorie, du lustre monumental à la lampe de chevet.
            </p>
          </div>

          {/* Grille — cases invisibles jusqu'à l'atterrissage */}
          <div className="cat-grid">
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat}
                ref={el => { cardsRef.current[i] = el }}
                style={{
                  opacity:    cardVisible[i] ? 1 : 0,
                  visibility: cardVisible[i] ? "visible" : "hidden",
                  transition: cardVisible[i] ? "opacity 0.15s ease" : "none",
                }}
              >
                <div
                  className={`cat-inner${cardVisible[i] ? " ready" : ""}`}
                  onClick={() => cardVisible[i] && router.push(`/luminaires?categorie=${encodeURIComponent(cat)}`)}
                >
                  {imgSrcs[i] && <img src={imgSrcs[i]!} alt={LABELS[i]} loading="lazy" />}
                  <div className="cat-overlay" />
                  <span className="cat-label">{LABELS[i]}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bouton */}
          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <Link href="/luminaires" className="cat-cta">
              Explorer la collection →
            </Link>
          </div>

        </div>
      </section>

      {/* Séparateur */}
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ height: "1px",
                      background: "linear-gradient(to right, transparent, rgba(139,115,85,0.2), transparent)" }} />
      </div>
    </>
  )
}
