"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Period {
  name:        string
  years:       string
  start:       number
  end:         number
  description: string
}

const PERIODS: Period[] = [
  { name: "Moyen-Âge",    years: "1000 - 1499",        start: 1000, end: 1499,
    description: "Flambeaux, candélabres et lanternes des cathédrales gothiques." },
  { name: "Renaissance",  years: "1500 - 1599",        start: 1500, end: 1599,
    description: "L'éclairage s'affine avec les lustres à bougie et les torchères." },
  { name: "Baroque",      years: "1600 - 1714",        start: 1600, end: 1714,
    description: "Fastes du grand siècle, lustres de cristal et girandoles." },
  { name: "Néoclassique", years: "1715 - 1789",        start: 1715, end: 1789,
    description: "Retour à l'antique, sobriété et harmonie des proportions." },
  { name: "Empire",       years: "1800 - 1850",        start: 1800, end: 1850,
    description: "Dorures impériales, aigles et motifs guerriers dans l'éclairage." },
  { name: "Art Nouveau",  years: "1890 - 1910",        start: 1890, end: 1910,
    description: "Formes organiques, vitraux colorés et motifs floraux de Gallé." },
  { name: "Art Déco",     years: "1920 - 1940",        start: 1920, end: 1940,
    description: "Géométrie élégante, laque et chrome dans les intérieurs parisiens." },
  { name: "Moderne",      years: "1950 - 1969",        start: 1950, end: 1969,
    description: "Design fonctionnel, acier et verre dans la reconstruction." },
  { name: "Contemporain", years: "1990 - aujourd'hui", start: 1990, end: 2030,
    description: "LED, impression 3D et matériaux durables réinventent l'éclairage." },
]

// Image positions (base values at imgScale=1, radius=270)
const IMG_OFFSETS = [
  { ex: -160, ey: -120 }, // top-left
  { ex:  160, ey: -120 }, // top-right
  { ex: -160, ey:  120 }, // bottom-left
  { ex:  160, ey:  120 }, // bottom-right
]

const CREAM     = "#f5f1e8"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"

// Fixed SVG arc constants (internal coordinate space)
const SVG_W  = 700
const SVG_H  = 240
const SVG_CX = 350
const SVG_CY = 240  // arc base sits at bottom of viewBox
const SVG_R  = 210

export function ChronoSection({ luminaires }: { luminaires: any[] }) {
  const router        = useRouter()
  const containerRef  = useRef<HTMLDivElement>(null)

  const [activeIndex,     setActiveIndex]     = useState(6)   // Art Déco default
  const [displayIdx,      setDisplayIdx]      = useState(6)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [imgScale,        setImgScale]        = useState(1)

  // Responsive image scale from container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      const r = Math.min(w * 0.32, 270)
      setImgScale(r / 270)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleSelect = useCallback((i: number) => {
    if (i === activeIndex || isTransitioning) return
    setIsTransitioning(true)
    setActiveIndex(i)
    setTimeout(() => {
      setDisplayIdx(i)
      setIsTransitioning(false)
    }, 300)
  }, [activeIndex, isTransitioning])

  const period     = PERIODS[displayIdx]
  const periodLums = luminaires
    .filter((l: any) => {
      const y = parseInt(l.annee || l["Année"] || l.year)
      return !isNaN(y) && y >= period.start && y <= period.end && l.filename
    })
    .slice(0, 4)

  return (
    <>
      <style>{`
        /* ── Explosion depuis le centre ── */
        @keyframes explode-out {
          0%   { transform: translate(0, 0) scale(0.3); opacity: 0; }
          60%  { transform: translate(var(--ex), var(--ey)) scale(1.05); opacity: 1; }
          100% { transform: translate(var(--ex), var(--ey)) scale(1);    opacity: 1; }
        }
        @keyframes explode-in {
          0%   { transform: translate(var(--ex), var(--ey)) scale(1);   opacity: 1; }
          100% { transform: translate(0, 0) scale(0.3); opacity: 0; }
        }
        .cw-img {
          position: absolute;
          border-radius: 10px;
          overflow: hidden;
          transform: translate(var(--ex), var(--ey));
        }
        .cw-img.out { animation: explode-out 0.5s ease-out both; }
        .cw-img.in  { animation: explode-in  0.3s ease-in  both; }

        /* ── Layout ── */
        .cw-content {
          display: flex;
          gap: 4rem;
          align-items: center;
          min-height: 380px;
        }
        .cw-text  { flex: 0 0 40%; }
        .cw-stage {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 380px;
        }

        /* ── Arc SVG ── */
        .cw-arc { display: flex; justify-content: center; }
        .cw-dot { transition: r 0.25s ease, fill 0.25s ease; }

        /* ── Mobile pills ── */
        .cw-mobile-nav { display: none; }

        /* ── CTA ── */
        .chrono-cta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: ${BROWN}; color: #fff;
          border-radius: 12px; font-weight: 500; font-size: 0.95rem;
          text-decoration: none; transition: background 0.2s;
        }
        .chrono-cta:hover { background: #75614a; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .cw-content { flex-direction: column; gap: 2rem; min-height: unset; }
          .cw-text    { flex: none; width: 100%; }
          .cw-stage   { width: 100%; }
        }
        @media (max-width: 600px) {
          .cw-arc        { display: none !important; }
          .cw-mobile-nav { display: flex !important; }
        }
      `}</style>

      <section style={{ background: CREAM, padding: "5rem 2rem" }}>
        <div ref={containerRef} style={{ maxWidth: "1200px", margin: "0 auto" }}>

          {/* ── En-tête ── */}
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: BROWN,
                           textTransform: "uppercase", letterSpacing: "0.1em",
                           display: "block", marginBottom: "0.75rem" }}>
              Chronologie
            </span>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif',
                         fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 600,
                         color: TEXT_DARK, margin: 0 }}>
              Un voyage à travers les époques
            </h2>
          </div>

          {/* ── Arc SVG (desktop) ── */}
          <div className="cw-arc" style={{ marginBottom: "3.5rem" }}>
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ width: "100%", maxWidth: "700px", overflow: "visible" }}
            >
              {/* Arc path: semicircle going upward */}
              <path
                d={`M ${SVG_CX - SVG_R} ${SVG_CY} A ${SVG_R} ${SVG_R} 0 0 0 ${SVG_CX + SVG_R} ${SVG_CY}`}
                fill="none"
                stroke="rgba(139,115,85,0.2)"
                strokeWidth="1.5"
              />
              {PERIODS.map((p, i) => {
                // angle: 180° (left) → 0° (right), passing through top
                const angle  = Math.PI - (i / (PERIODS.length - 1)) * Math.PI
                const x      = SVG_CX + SVG_R * Math.cos(angle)
                const y      = SVG_CY - SVG_R * Math.sin(angle)
                const active = i === activeIndex
                return (
                  <g key={p.name} onClick={() => handleSelect(i)} style={{ cursor: "pointer" }}>
                    {/* Enlarged transparent hit area */}
                    <circle cx={x} cy={y} r={20} fill="transparent" />
                    <circle
                      cx={x} cy={y}
                      r={active ? 9 : 6}
                      fill={active ? BROWN : "#e0d5c5"}
                      stroke={active ? BROWN : "rgba(139,115,85,0.5)"}
                      strokeWidth="1.5"
                      className="cw-dot"
                    />
                    <text
                      x={x}
                      y={y - (active ? 17 : 15)}
                      textAnchor="middle"
                      fontSize={active ? "12" : "10.5"}
                      fontFamily='"Playfair Display", Georgia, serif'
                      fill={active ? TEXT_DARK : TEXT_MID}
                      fontWeight={active ? "600" : "400"}
                      style={{ userSelect: "none", pointerEvents: "none",
                               transition: "fill 0.25s, font-size 0.25s" }}
                    >
                      {p.name}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* ── Mobile nav pills ── */}
          <div
            className="cw-mobile-nav"
            style={{ gap: "0.4rem", flexWrap: "wrap",
                     justifyContent: "center", marginBottom: "2rem" }}
          >
            {PERIODS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => handleSelect(i)}
                style={{
                  padding: "0.3rem 0.8rem",
                  borderRadius: "50px",
                  border: `1.5px solid ${i === activeIndex ? BROWN : "rgba(139,115,85,0.3)"}`,
                  background: i === activeIndex ? BROWN : "transparent",
                  color: i === activeIndex ? "#fff" : TEXT_MID,
                  fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                  fontFamily: '"Playfair Display", Georgia, serif',
                  transition: "all 0.2s",
                }}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* ── Contenu : texte + images ── */}
          <div className="cw-content">

            {/* Texte */}
            <div className="cw-text">
              <div style={{ fontSize: "5rem", fontWeight: 700,
                            color: TEXT_DARK, opacity: 0.08,
                            lineHeight: 1, marginBottom: "0.25rem",
                            fontFamily: '"Playfair Display", Georgia, serif',
                            userSelect: "none" }}>
                {period.years.split(" ")[0]}
              </div>
              <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif',
                           fontSize: "3rem", fontWeight: 600,
                           color: TEXT_DARK, margin: "0 0 0.75rem", lineHeight: 1.1 }}>
                {period.name}
              </h3>
              <p style={{ fontSize: "0.95rem", color: TEXT_MID,
                          marginBottom: "1.5rem", lineHeight: 1.6, maxWidth: "340px" }}>
                {period.description}
              </p>
              <Link
                href={`/luminaires?yearMin=${period.start}&yearMax=${period.end}`}
                style={{ fontSize: "0.9rem", color: BROWN, textDecoration: "none",
                         fontWeight: 500, display: "inline-flex",
                         alignItems: "center", gap: "0.3rem" }}
              >
                Voir les luminaires →
              </Link>
            </div>

            {/* Scène d'explosion */}
            <div className="cw-stage">
              {IMG_OFFSETS.map(({ ex, ey }, idx) => {
                const lum      = periodLums[idx]
                const scaledEx = Math.round(ex * imgScale)
                const scaledEy = Math.round(ey * imgScale)
                const w        = Math.round(120 * imgScale)
                const h        = Math.round(160 * imgScale)

                return (
                  <div
                    key={`${displayIdx}-${idx}`}
                    className={`cw-img ${isTransitioning ? "in" : "out"}`}
                    style={{
                      "--ex": `${scaledEx}px`,
                      "--ey": `${scaledEy}px`,
                      width:  `${w}px`,
                      height: `${h}px`,
                      animationDelay: isTransitioning ? "0ms" : `${idx * 80}ms`,
                      cursor: lum ? "pointer" : "default",
                    } as React.CSSProperties}
                    onClick={() => lum && router.push(`/luminaires/${lum._id}`)}
                  >
                    {lum
                      ? <img
                          src={`/api/images/filename/${lum.filename}`}
                          alt={lum.nom || ""}
                          style={{ width: "100%", height: "100%",
                                   objectFit: "cover", display: "block" }}
                          loading="lazy"
                        />
                      : <div style={{ width: "100%", height: "100%", background: "#e8e0d0" }} />
                    }
                  </div>
                )
              })}
            </div>

          </div>

          {/* ── Bouton global ── */}
          <div style={{ textAlign: "center", marginTop: "3.5rem" }}>
            <Link href="/chronologie" className="chrono-cta">
              Explorer la chronologie complète →
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
