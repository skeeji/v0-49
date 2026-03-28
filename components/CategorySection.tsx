"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface CategorySectionProps {
  luminaires:    any[]
  homepageImages: Record<string, string>
}

const CATEGORIES = ["Lustre", "Applique", "Suspension", "Lampadaire", "Lampe", "Lanterne"]
const CREAM      = "#f5f1e8"
const BROWN      = "#8b7355"
const TEXT_DARK  = "#3d2b1f"
const TEXT_MID   = "#7a6654"

export function CategorySection({ luminaires, homepageImages }: CategorySectionProps) {
  const router     = useRouter()
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        /* ── Animation atterrissage ── */
        @keyframes drop-in {
          0%   { transform: translateY(-80px); opacity: 0; }
          75%  { transform: translateY(6px);   opacity: 1; }
          90%  { transform: translateY(-4px);  opacity: 1; }
          100% { transform: translateY(0px);   opacity: 1; }
        }

        /* ── Wrapper animé (séparé du hover pour éviter conflits) ── */
        .cat-card {
          /* état invisible avant déclenchement */
        }
        .cat-card.animate {
          animation: drop-in 0.8s ease-out both;
        }

        /* ── Couche visuelle (hover isolé) ── */
        .cat-inner {
          height: 320px;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          box-shadow: 0 8px 32px rgba(0,0,0,0.10);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          background: #e8e0d0;
        }
        @media (max-width: 767px) {
          .cat-inner { height: 200px; }
          .cat-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .cat-inner:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.15);
        }
        .cat-inner img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          transition: transform 0.3s ease;
        }
        .cat-inner:hover img { transform: scale(1.03); }

        /* ── Overlay + label ── */
        .cat-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.50) 0%, transparent 55%);
          pointer-events: none;
        }
        .cat-label {
          position: absolute; bottom: 1rem; left: 1rem;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.4rem; font-weight: 600;
          color: #fff;
          text-shadow: 0 1px 6px rgba(0,0,0,0.45);
          pointer-events: none;
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
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

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
          <div className="cat-grid"
               style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
            {CATEGORIES.map((cat, i) => {
              const overrideImg = homepageImages[`homepage_luminaire_${i}`]
              const match = luminaires.find((l: any) =>
                ((l.categorie || "").toLowerCase().includes(cat.toLowerCase()) ||
                 (l["Catégorie"] || "").toLowerCase().includes(cat.toLowerCase())) &&
                l.filename
              )
              const imgSrc = overrideImg || (match ? `/api/images/filename/${match.filename}` : null)

              return (
                <div
                  key={cat}
                  className={`cat-card${visible ? " animate" : ""}`}
                  style={visible
                    ? { animationDelay: `${i * 150}ms` }
                    : { opacity: 0 }
                  }
                >
                  <div
                    className="cat-inner"
                    onClick={() => router.push(`/luminaires?categorie=${encodeURIComponent(cat)}`)}
                  >
                    {imgSrc && <img src={imgSrc} alt={cat} loading="lazy" />}
                    <div className="cat-overlay" />
                    <span className="cat-label">{cat}s</span>
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
