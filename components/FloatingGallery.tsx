"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// ─── Types ──────────────────────────────────────────────────────────────────

interface LuminaireItem {
  _id: string
  imageUrl: string
  nom: string
}

// ─── Configuration des rangées ───────────────────────────────────────────────
// Positions fixes (pas de Math.random) → pas de hydration mismatch Next.js

interface RowConfig {
  id: number
  topPercent: number   // position verticale en %
  height: number       // hauteur des cartes en px
  duration: number     // durée animation en secondes
  direction: "left" | "right"
}

const ROWS_DESKTOP: RowConfig[] = [
  { id: 0, topPercent: 3,  height: 155, duration: 25, direction: "left"  },
  { id: 1, topPercent: 22, height: 170, duration: 32, direction: "right" },
  { id: 2, topPercent: 41, height: 185, duration: 28, direction: "left"  },
  { id: 3, topPercent: 60, height: 170, duration: 35, direction: "right" },
  { id: 4, topPercent: 78, height: 155, duration: 22, direction: "left"  },
]

const ROWS_MOBILE: RowConfig[] = [
  { id: 0, topPercent: 6,  height: 120, duration: 18, direction: "left"  },
  { id: 1, topPercent: 38, height: 130, duration: 22, direction: "right" },
  { id: 2, topPercent: 70, height: 120, duration: 20, direction: "left"  },
]

// Largeurs alternées par index
const WIDTHS_DESKTOP = [180, 220, 260, 200, 240]
const WIDTHS_MOBILE  = [140, 170, 150, 160, 145]

const CREAM = "#f5f1e8"
const BROWN = "#8b7355"
const BROWN_DARK = "#6d5a40"
const TEXT_DARK = "#3d2b1f"

// ─── Composant ───────────────────────────────────────────────────────────────

export function FloatingGallery() {
  const router = useRouter()

  const [items, setItems]     = useState<LuminaireItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [btnHover, setBtnHover] = useState(false)

  // ── Détection mobile ──────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // ── Fetch luminaires ──────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchItems() {
      try {
        const res  = await fetch("/api/luminaires?page=1&limit=100")
        const data = await res.json()

        if (data.success && data.luminaires?.length > 0) {
          const filtered: LuminaireItem[] = data.luminaires
            .filter((l: any) => l.filename && l._id)
            .map((l: any) => ({
              _id:      l._id,
              imageUrl: `/api/images/filename/${l.filename}`,
              nom:      l.nom || l["Nom luminaire"] || "",
            }))

          if (filtered.length > 0) {
            setItems(filtered)
          } else {
            setError(true)
          }
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchItems()
  }, [])

  // ── Triple pour boucle infinie ────────────────────────────────────────────
  const tripled = useMemo(() => {
    if (items.length === 0) return []
    return [...items, ...items, ...items]
  }, [items])

  // ── Rows selon breakpoint ─────────────────────────────────────────────────
  const rows = useMemo(
    () => (isMobile ? ROWS_MOBILE : ROWS_DESKTOP),
    [isMobile]
  )

  // ── Largeur d'une carte selon son index et le breakpoint ──────────────────
  const getWidth = (idx: number): number => {
    const sizes = isMobile ? WIDTHS_MOBILE : WIDTHS_DESKTOP
    return sizes[idx % sizes.length]
  }

  // ─── États intermédiaires ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        width: "100%", height: "100vh",
        background: CREAM,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <p style={{ fontFamily: '"Playfair Display", Georgia, serif', color: BROWN, fontSize: "1.1rem" }}>
          Chargement…
        </p>
      </div>
    )
  }

  if (error || items.length === 0) {
    return (
      <div style={{
        width: "100%", height: "100vh",
        background: CREAM,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', color: TEXT_DARK, fontSize: "2.5rem", marginBottom: "1.5rem" }}>
            Nos Luminaires
          </h2>
          <Link href="/luminaires" style={{
            display: "inline-block", padding: "0.75rem 2rem",
            background: BROWN, color: "#fff", borderRadius: "8px",
            fontFamily: "system-ui, sans-serif", fontSize: "0.95rem",
            fontWeight: 500, textDecoration: "none",
          }}>
            Découvrir la collection →
          </Link>
        </div>
      </div>
    )
  }

  // ─── Rendu principal ──────────────────────────────────────────────────────

  return (
    <>
      {/* ── CSS animations pures — aucune lib externe ── */}
      <style>{`
        @keyframes fg-scroll-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.3334%); }
        }
        @keyframes fg-scroll-right {
          from { transform: translateX(-33.3334%); }
          to   { transform: translateX(0); }
        }

        /* Rangée scrollante */
        .fg-row {
          position: absolute;
          left: 0;
          display: flex;
          flex-wrap: nowrap;
          gap: 14px;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-play-state: running;
          will-change: transform;
        }

        /* Pause globale quand la section est survolée */
        .fg-section.fg-paused .fg-row {
          animation-play-state: paused !important;
        }

        /* Carte image */
        .fg-card {
          flex-shrink: 0;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          background: #e8e0d0;
        }
        .fg-card:hover {
          transform: scale(1.04);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
        }
        .fg-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Overlay central */
        .fg-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          text-align: center;
          padding: 2rem 3rem;
          border-radius: 16px;
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          background: rgba(245, 241, 232, 0.45);
          pointer-events: none;
        }
        .fg-center-inner {
          pointer-events: auto;
        }
        .fg-title {
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(1.8rem, 4vw, 3rem);
          font-weight: 600;
          color: ${TEXT_DARK};
          letter-spacing: -0.02em;
          margin: 0 0 1.25rem 0;
          white-space: nowrap;
        }
        .fg-subtitle {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.9rem;
          color: #7a6654;
          margin: 0 0 1.5rem 0;
          font-weight: 400;
          letter-spacing: 0.02em;
        }
        .fg-btn {
          display: inline-block;
          padding: 0.8rem 2.2rem;
          background: ${BROWN};
          color: #ffffff;
          border-radius: 8px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          text-decoration: none;
          letter-spacing: 0.01em;
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .fg-btn:hover {
          background: ${BROWN_DARK};
          transform: translateY(-1px);
        }

        /* Dégradés bords */
        .fg-fade {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 16%;
          pointer-events: none;
          z-index: 5;
        }
        .fg-fade-left  { left: 0;  background: linear-gradient(to right, ${CREAM} 0%, transparent 100%); }
        .fg-fade-right { right: 0; background: linear-gradient(to left,  ${CREAM} 0%, transparent 100%); }

        @media (max-width: 767px) {
          .fg-center { padding: 1.25rem 1.75rem; }
          .fg-title  { white-space: normal; font-size: 1.6rem; }
          .fg-btn    { font-size: 0.88rem; padding: 0.7rem 1.6rem; }
          .fg-fade   { width: 10%; }
        }
      `}</style>

      <section
        className={`fg-section${isPaused ? " fg-paused" : ""}`}
        style={{
          width: "100%",
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          background: CREAM,
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >

        {/* ── Rangées défilantes ── */}
        {rows.map((row) => (
          <div
            key={row.id}
            className="fg-row"
            style={{
              top:               `${row.topPercent}%`,
              animationName:     row.direction === "left" ? "fg-scroll-left" : "fg-scroll-right",
              animationDuration: `${row.duration}s`,
            }}
          >
            {tripled.map((item, idx) => (
              <div
                key={`r${row.id}-i${idx}`}
                className="fg-card"
                style={{
                  width:  `${getWidth(idx)}px`,
                  height: `${row.height}px`,
                }}
                onClick={() => router.push(`/luminaires/${item._id}`)}
                title={item.nom || undefined}
              >
                <img
                  src={item.imageUrl}
                  alt={item.nom || `Luminaire ${(idx % items.length) + 1}`}
                  loading="lazy"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        ))}

        {/* ── Dégradé bord gauche ── */}
        <div className="fg-fade fg-fade-left" />

        {/* ── Dégradé bord droit ── */}
        <div className="fg-fade fg-fade-right" />

        {/* ── Overlay central ── */}
        <div className="fg-center">
          <div className="fg-center-inner">
            <h2 className="fg-title">Nos Luminaires</h2>
            <p className="fg-subtitle">Du Moyen-Âge à nos jours</p>
            <Link
              href="/luminaires"
              className="fg-btn"
            >
              Découvrir la collection →
            </Link>
          </div>
        </div>

      </section>
    </>
  )
}
