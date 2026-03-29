"use client"

import { useEffect, useRef } from "react"
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
const WIDTH_STARTS  = [110, 110, 110, 110, 110, 110]
const HEIGHT_STARTS = [165, 110,  77, 165, 110,  77]
const CARD_HEIGHTS  = [320, 240, 280, 260, 300, 220]

const CREAM     = "#f5f1e8"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"

export function CategorySection({ luminaires, homepageImages }: CategorySectionProps) {
  const router = useRouter()

  const cardsRef       = useRef<(HTMLDivElement | null)[]>([])
  const cloneRefs      = useRef<(HTMLDivElement | null)[]>([])
  const overlayRef     = useRef<HTMLDivElement | null>(null)
  const destPagePos    = useRef<{ x: number; y: number; w: number; h: number }[]>([])
  const animFrameRef   = useRef<number>()

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
    const timer = setTimeout(measure, 200)
    window.addEventListener("resize", measure)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", measure)
    }
  }, [luminaires])

  // RAF scroll-driven : overlay + clones
  useEffect(() => {
    const update = () => {
      const scrollY  = window.scrollY
      const vh       = window.innerHeight
      const progress = Math.min(scrollY / vh, 1)

      const fgEl   = document.getElementById("floating-gallery")
      const fgRect = fgEl?.getBoundingClientRect()
      const overlay = overlayRef.current

      if (overlay && fgRect) {
        overlay.style.top    = `${fgRect.top}px`
        overlay.style.left   = `${fgRect.left}px`
        overlay.style.width  = `${fgRect.width}px`
        overlay.style.height = `${fgRect.height}px`
        overlay.style.display = fgRect.bottom < 0 ? "none" : "block"
      }

      console.log("RAF running, scrollY:", scrollY)
      console.log("dest[0]:", destPagePos.current[0])
      console.log("clone[0] display:", cloneRefs.current[0]?.style.display)

      if (scrollY > 5) {
        cloneRefs.current.forEach(el => {
          if (el) el.style.display = "block"
        })
      }

      ANGLES_6.forEach((angleDeg, i) => {
        const el = cloneRefs.current[i]
        if (!el || !fgRect) return

        const rad    = angleDeg * Math.PI / 180
        const offset = START_OFFSETS[i]
        const wStart = WIDTH_STARTS[i]
        const hStart = HEIGHT_STARTS[i]

        // Position départ dans l'overlay (relatif au coin haut-gauche de la FG)
        const cx = fgRect.width  / 2
        const cy = fgRect.height / 2
        const sx = cx + Math.cos(rad) * offset - wStart / 2
        const sy = cy + Math.sin(rad) * offset - hStart / 2

        const startP = i * 0.12
        const p      = Math.max(0, Math.min(1, (progress - startP) / 0.40))
        const ease   = p * p * (3 - 2 * p)

        const dest = destPagePos.current[i]
        if (!dest || dest.w === 0) {
          el.style.transform = `translate(${sx}px, ${sy}px)`
          el.style.width     = `${wStart}px`
          el.style.height    = `${hStart}px`
          el.style.opacity   = scrollY > 0 ? "0.75" : "0"
          el.style.display   = "block"
          return
        }

        // Destination en coordonnées overlay
        const dx = (dest.x - window.scrollX) - fgRect.left
        const dy = (dest.y - window.scrollY) - fgRect.top

        const x = sx + (dx - sx) * ease
        const y = sy + (dy - sy) * ease
        const w = wStart + (dest.w - wStart) * ease
        const h = hStart + (dest.h - hStart) * ease

        // Opacity : 0 si scroll=0, sinon 0.75→1, fondu sortie quand ease > 0.85
        const opBase = scrollY > 0 ? (0.75 + 0.25 * ease) : 0
        const op     = ease > 0.85
          ? opBase * (1 - (ease - 0.85) / 0.15)
          : opBase

        el.style.transform = `translate(${x}px, ${y}px)`
        el.style.width     = `${w}px`
        el.style.height    = `${h}px`
        el.style.opacity   = String(op)
        el.style.display   = "block"
      })

      animFrameRef.current = requestAnimationFrame(update)
    }

    animFrameRef.current = requestAnimationFrame(update)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [])

  return (
    <>
      <style>{`
        .cat-masonry {
          columns: 3;
          column-gap: 20px;
        }
        @media (max-width: 767px) {
          .cat-masonry { columns: 2; }
        }
        .cat-masonry-item {
          break-inside: avoid;
          margin-bottom: 20px;
        }
        .cat-inner {
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          background: #faf8f4;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          pointer-events: auto;
        }
        .cat-inner.ready {
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .cat-inner.ready:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.14);
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
        .cat-cta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: ${BROWN}; color: #fff;
          border-radius: 12px; font-weight: 500; font-size: 0.95rem;
          text-decoration: none; transition: background 0.2s;
        }
        .cat-cta:hover { background: #75614a; }
      `}</style>

      {/* ── Overlay fixed couvrant la FloatingGallery ── */}
      <div
        ref={overlayRef}
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          width:         0,
          height:        0,
          overflow:      "hidden",
          pointerEvents: "none",
          zIndex:        40,
          display:       "none",
        }}
      >
        {CATEGORIES.map((cat, i) => (
          <div
            key={`clone-${cat}`}
            ref={el => { cloneRefs.current[i] = el }}
            style={{
              position:    "absolute",
              top:         0,
              left:        0,
              width:       `${WIDTH_STARTS[i]}px`,
              height:      `${HEIGHT_STARTS[i]}px`,
              borderRadius: "14px",
              overflow:    "hidden",
              boxShadow:   "0 4px 20px rgba(0,0,0,0.06)",
              willChange:  "transform, width, height, opacity",
              opacity:     0,
              display:     "none",
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
      </div>

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

          {/* Masonry */}
          <div className="cat-masonry">
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat}
                className="cat-masonry-item"
                ref={el => { cardsRef.current[i] = el }}
                style={{ opacity: 1, visibility: "visible" }}
              >
                <div
                  className="cat-inner ready"
                  style={{ height: `${CARD_HEIGHTS[i]}px` }}
                  onClick={() => router.push(`/luminaires?categorie=${encodeURIComponent(cat)}`)}
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
