"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface CategorySectionProps {
  luminaires:     any[]
  homepageImages: Record<string, string>
}

const CATEGORIES = ["Lustre", "Applique", "Suspension", "Lampadaire", "Lampe", "Lanterne"]
const LABELS     = ["Lustres", "Appliques", "Suspensions", "Lampadaires", "Lampes", "Lanternes"]
const HEIGHTS    = [320, 240, 280, 260, 300, 220]  // px desktop

const CREAM     = "#f5f1e8"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"

export function CategorySection({ luminaires, homepageImages }: CategorySectionProps) {
  const router    = useRouter()
  const cardsRef  = useRef<(HTMLDivElement | null)[]>([])

  const step    = luminaires.length > 0 ? Math.floor(luminaires.length / 6) : 0
  const imgSrcs = CATEGORIES.map((_, i) => {
    const override = homepageImages[`homepage_luminaire_${i}`]
    const pick     = step > 0 ? luminaires[i * step] : null
    return override || (pick?.filename ? `/api/images/filename/${pick.filename}` : null)
  })

  // IntersectionObserver individuel sur chaque carte
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    cardsRef.current.forEach((el, i) => {
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add("cat-visible")
            observer.disconnect()
          }
        },
        { threshold: 0.1 }
      )
      observer.observe(el)
      observers.push(observer)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [luminaires])

  return (
    <>
      <style>{`
        /* ── Masonry via CSS columns ── */
        .cat-columns {
          columns: 3;
          column-gap: 16px;
        }
        @media (max-width: 899px) { .cat-columns { columns: 2; } }
        @media (max-width: 599px) { .cat-columns { columns: 2; } }

        /* ── Carte : animation entrée ── */
        .cat-card {
          break-inside: avoid;
          margin-bottom: 16px;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          background: #faf8f4;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          cursor: pointer;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.5s ease, transform 0.5s ease,
                      box-shadow 0.3s ease;
        }
        .cat-card.cat-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .cat-card:hover {
          box-shadow: 0 12px 36px rgba(0,0,0,0.12);
        }
        .cat-card img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          transition: transform 0.4s ease;
        }
        .cat-card:hover img { transform: scale(1.04); }

        /* ── Overlay + label ── */
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

        /* ── Mobile : hauteurs réduites ── */
        @media (max-width: 599px) {
          .cat-card { margin-bottom: 10px; }
        }

        /* ── CTA ── */
        .cat-cta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: ${BROWN}; color: #fff;
          border-radius: 12px; font-weight: 500; font-size: 0.95rem;
          text-decoration: none; transition: background 0.2s;
        }
        .cat-cta:hover { background: #75614a; }
      `}</style>

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
          <div className="cat-columns">
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat}
                ref={el => { cardsRef.current[i] = el }}
                className="cat-card"
                style={{
                  height:            `${HEIGHTS[i]}px`,
                  transitionDelay:   `${i * 80}ms`,
                }}
                onClick={() => router.push(`/luminaires?categorie=${encodeURIComponent(cat)}`)}
              >
                {imgSrcs[i] && (
                  <img src={imgSrcs[i]!} alt={LABELS[i]} loading="lazy" />
                )}
                <div className="cat-overlay" />
                <span className="cat-label">{LABELS[i]}</span>
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
