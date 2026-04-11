"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface CategorySectionProps {
  luminaires:     any[]
  homepageImages: Record<string, string>
}

const CATEGORIES = ["Lustre", "Applique", "Suspension", "Lampadaire", "Lampe", "Lanterne"]
const LABELS     = ["Lustres", "Appliques", "Suspensions", "Lampadaires", "Lampes", "Lanternes"]

const CREAM = "#f5f1e8"
const BROWN = "#8b7355"
const TEXT_DARK = "#3d2b1f"

export function CategorySection({ luminaires, homepageImages }: CategorySectionProps) {
  const router = useRouter()

  const step    = luminaires.length > 0 ? Math.floor(luminaires.length / 6) : 0
  const imgSrcs = CATEGORIES.map((_, i) => {
    const override = homepageImages[`homepage_luminaire_${i}`]
    const pick     = step > 0 ? luminaires[i * step] : null
    return override || (pick?.filename ? `/api/images/filename/${pick.filename}` : null)
  })

  return (
    <>
      <section style={{ background: CREAM, padding: "4rem 2rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "2rem 2.5rem",
          }}>
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat}
                onClick={() => router.push(`/luminaires?categorie=${encodeURIComponent(cat)}`)}
                style={{ cursor: "pointer" }}
              >
                {/* Image carrée */}
                <div style={{
                  aspectRatio: "1 / 1",
                  overflow: "hidden",
                  background: "#ede8de",
                  marginBottom: "0.75rem",
                }}>
                  {imgSrcs[i] && (
                    <img
                      src={imgSrcs[i]!}
                      alt={LABELS[i]}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        transition: "transform 0.4s ease",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                    />
                  )}
                </div>

                {/* Label sous l'image */}
                <p style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "0.72rem",
                  fontWeight: 400,
                  color: TEXT_DARK,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  margin: 0,
                  textAlign: "center",
                }}>
                  {LABELS[i]}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Séparateur */}
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ height: "1px",
                      background: "linear-gradient(to right, transparent, rgba(139,115,85,0.2), transparent)" }} />
      </div>

      <style>{`
        @media (max-width: 640px) {
          .cat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </>
  )
}
