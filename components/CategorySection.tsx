"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface CategorySectionProps {
  luminaires:     any[]
  homepageImages: Record<string, string>
}

interface CloneState {
  id:         number
  top:        number   // px dans le viewport
  left:       number   // px dans le viewport
  width:      number   // px
  height:     number   // px
  rot:        number   // degrés
  flying:     boolean
  destTop:    number
  destLeft:   number
  destWidth:  number
  destHeight: number
  imgSrc:     string | null
}

const CATEGORIES = ["Lustre", "Applique", "Suspension", "Lampadaire", "Lampe", "Lanterne"]
const LABELS     = ["Lustres", "Appliques", "Suspensions", "Lampadaires", "Lampes", "Lanternes"]

const CREAM     = "#f5f1e8"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"

// Positions de départ fixes dans le viewport (seed déterministe)
const CLONE_CONFIGS = [
  { top: 20, left: 15, width: 180, rot: -5 },
  { top: 55, left: 60, width: 160, rot:  4 },
  { top: 30, left: 75, width: 200, rot: -3 },
  { top: 65, left: 25, width: 170, rot:  6 },
  { top: 40, left: 45, width: 190, rot: -4 },
  { top: 25, left: 80, width: 165, rot:  3 },
]

export function CategorySection({ luminaires, homepageImages }: CategorySectionProps) {
  const router    = useRouter()
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardsRef  = useRef<(HTMLDivElement | null)[]>([])
  const triggered = useRef(false)
  const imgSrcsRef = useRef<(string | null)[]>([])

  const [clones,      setClones]      = useState<CloneState[]>([])
  const [cardVisible, setCardVisible] = useState<boolean[]>(Array(6).fill(false))

  // Maintenir imgSrcs à jour à chaque render
  const step = luminaires.length > 0 ? Math.floor(luminaires.length / 6) : 0
  imgSrcsRef.current = CATEGORIES.map((_, i) => {
    const override = homepageImages[`homepage_luminaire_${i}`]
    const pick     = step > 0 ? luminaires[i * step] : null
    return override || (pick?.filename ? `/api/images/filename/${pick.filename}` : null)
  })

  useEffect(() => {
    const handler = () => {
      if (triggered.current) return
      if (window.scrollY < 30) return
      const sectionEl = sectionRef.current
      if (!sectionEl) return
      const rect = sectionEl.getBoundingClientRect()
      if (rect.top > window.innerHeight * 0.9) return

      triggered.current = true
      window.removeEventListener("scroll", handler)

      CLONE_CONFIGS.forEach((cfg, i) => {
        setTimeout(() => {
          const imgSrc   = imgSrcsRef.current[i]
          const initTop  = (cfg.top  / 100) * window.innerHeight
          const initLeft = (cfg.left / 100) * window.innerWidth
          const height   = cfg.width * 1.4

          // Phase A — clone apparaît à sa position FG
          setClones(prev => [...prev, {
            id: i,
            top: initTop, left: initLeft,
            width: cfg.width, height,
            rot: cfg.rot,
            flying: false,
            destTop: 0, destLeft: 0, destWidth: 0, destHeight: 0,
            imgSrc,
          }])

          // Phase B — vol vers la case (150ms après apparition)
          setTimeout(() => {
            const cardEl = cardsRef.current[i]
            if (!cardEl) return
            const dest = cardEl.getBoundingClientRect()
            setClones(prev => prev.map(c =>
              c.id === i
                ? { ...c, flying: true,
                    destTop: dest.top, destLeft: dest.left,
                    destWidth: dest.width, destHeight: dest.height }
                : c
            ))

            // Phase C — atterrissage : supprimer clone, révéler vraie carte
            setTimeout(() => {
              setClones(prev => prev.filter(c => c.id !== i))
              setCardVisible(prev => {
                const next = [...prev]
                next[i] = true
                return next
              })
            }, 950)
          }, 150)
        }, i * 800)
      })
    }

    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <>
      <style>{`
        .cat-inner {
          height: 340px;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          background: #faf8f4;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .cat-inner:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.12);
        }
        .cat-inner img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          transition: transform 0.35s ease;
        }
        .cat-inner:hover img { transform: scale(1.04); }

        .cat-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%);
          pointer-events: none;
        }
        .cat-label {
          position: absolute; bottom: 1rem; left: 1rem;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.3rem; font-weight: 600;
          color: #fff;
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

      {/* ── Clones FIXED — volent depuis la FG vers leurs cases ── */}
      {clones.map(clone => (
        <div
          key={clone.id}
          style={{
            position:     "fixed",
            top:          clone.flying ? `${clone.destTop}px`    : `${clone.top}px`,
            left:         clone.flying ? `${clone.destLeft}px`   : `${clone.left}px`,
            width:        clone.flying ? `${clone.destWidth}px`  : `${clone.width}px`,
            height:       clone.flying ? `${clone.destHeight}px` : `${clone.height}px`,
            borderRadius: "14px",
            overflow:     "hidden",
            boxShadow:    "0 4px 20px rgba(0,0,0,0.10)",
            transform:    clone.flying ? "rotate(0deg)" : `rotate(${clone.rot}deg)`,
            transition:   clone.flying
              ? [
                  "top 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
                  "left 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
                  "width 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
                  "height 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
                  "transform 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
                ].join(", ")
              : "none",
            zIndex:        100,
            pointerEvents: "none",
          }}
        >
          {clone.imgSrc && (
            <img
              src={clone.imgSrc}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
        </div>
      ))}

      <section ref={sectionRef} style={{ background: CREAM, padding: "5rem 2rem" }}>
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

          {/* Grille — cartes invisibles jusqu'à l'atterrissage du clone */}
          <div className="cat-grid">
            {CATEGORIES.map((cat, i) => {
              const imgSrc = imgSrcsRef.current[i]
              return (
                <div
                  key={cat}
                  ref={el => { cardsRef.current[i] = el }}
                  style={{
                    opacity:    cardVisible[i] ? 1 : 0,
                    transition: cardVisible[i] ? "opacity 0.2s ease" : "none",
                  }}
                >
                  <div
                    className="cat-inner"
                    onClick={() => router.push(`/luminaires?categorie=${encodeURIComponent(cat)}`)}
                  >
                    {imgSrc && <img src={imgSrc} alt={LABELS[i]} loading="lazy" />}
                    <div className="cat-overlay" />
                    <span className="cat-label">{LABELS[i]}</span>
                  </div>
                </div>
              )
            })}
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
