"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface CategorySectionProps {
  luminaires:     any[]
  homepageImages: Record<string, string>
}

const CATEGORIES = ["Lustre", "Applique", "Suspension", "Lampadaire", "Lampe", "Lanterne"]
const LABELS     = ["Lustres", "Appliques", "Suspensions", "Lampadaires", "Lampes", "Lanternes"]

const CREAM     = "#f5f1e8"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"

// Trajectoires de départ — seed fixe, déterministe
const OFFSETS = [
  { x: -120, y: -280, rot: -6 },
  { x:   60, y: -320, rot:  4 },
  { x:  180, y: -240, rot: -3 },
  { x:  -80, y: -300, rot:  7 },
  { x:   30, y: -260, rot: -5 },
  { x:  140, y: -290, rot:  3 },
]

export function CategorySection({ luminaires, homepageImages }: CategorySectionProps) {
  const router     = useRouter()
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -50px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const step = luminaires.length > 0 ? Math.floor(luminaires.length / 6) : 0

  return (
    <>
      <style>{`
        /* ── Keyframe par carte : scale 0.18 → 1 (taille FG → taille carte) ── */
        ${OFFSETS.map(({ x, y, rot }, i) => `
          @keyframes card-settle-${i} {
            0%   { transform: translate(${x}px, ${y}px) scale(0.18) rotate(${rot}deg); opacity: 0.7; }
            60%  { transform: translate(0px,  12px) scale(1.04) rotate(0deg); opacity: 1; }
            80%  { transform: translate(0px,  -5px) scale(0.98) rotate(0deg); opacity: 1; }
            100% { transform: translate(0px,   0px) scale(1)    rotate(0deg); opacity: 1; }
          }
        `).join("")}

        /* ── Wrapper par carte : état initial + animation ── */
        ${OFFSETS.map(({ x, y, rot }, i) => `
          .cat-wrapper-${i} {
            opacity: 0.7;
            transform: translate(${x}px, ${y}px) scale(0.18) rotate(${rot}deg);
          }
          .cat-wrapper-${i}.animate {
            animation: card-settle-${i} 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) both;
            animation-delay: ${i * 130}ms;
          }
        `).join("")}

        /* ── Inner : hover uniquement, sans conflit animation ── */
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

        /* ── Overlay + label ── */
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

        /* ── Grille ── */
        .cat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 767px) {
          .cat-grid  { grid-template-columns: repeat(2, 1fr); }
          .cat-inner { height: 220px; }
        }

        /* ── Bouton CTA ── */
        .cat-cta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: ${BROWN}; color: #fff;
          border-radius: 12px; font-weight: 500; font-size: 0.95rem;
          text-decoration: none; transition: background 0.2s;
        }
        .cat-cta:hover { background: #75614a; }
      `}</style>

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

          {/* Grille */}
          <div className="cat-grid">
            {CATEGORIES.map((cat, i) => {
              const overrideImg = homepageImages[`homepage_luminaire_${i}`]
              const pick        = step > 0 ? luminaires[i * step] : null
              const imgSrc      = overrideImg || (pick?.filename ? `/api/images/filename/${pick.filename}` : null)

              return (
                <div
                  key={cat}
                  className={`cat-wrapper-${i}${visible ? " animate" : ""}`}
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
