"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Period {
  name:        string
  years:       string
  start:       number
  end:         number
  description: string
}

interface ChronoSectionProps {
  luminaires: any[]
}

const PERIODS: Period[] = [
  { name: "Moyen-Âge",    years: "1000 - 1499",          start: 1000, end: 1499,
    description: "Flambeaux, candélabres et lanternes des cathédrales gothiques." },
  { name: "Renaissance",  years: "1500 - 1599",          start: 1500, end: 1599,
    description: "L'éclairage s'affine avec les lustres à bougie et les torchères." },
  { name: "Baroque",      years: "1600 - 1714",          start: 1600, end: 1714,
    description: "Fastes du grand siècle, lustres de cristal et girandoles." },
  { name: "Néoclassique", years: "1715 - 1789",          start: 1715, end: 1789,
    description: "Retour à l'antique, sobriété et harmonie des proportions." },
  { name: "Empire",       years: "1800 - 1850",          start: 1800, end: 1850,
    description: "Dorures impériales, aigles et motifs guerriers dans l'éclairage." },
  { name: "Art Nouveau",  years: "1890 - 1910",          start: 1890, end: 1910,
    description: "Formes organiques, vitraux colorés et motifs floraux de Gallé." },
  { name: "Art Déco",     years: "1920 - 1940",          start: 1920, end: 1940,
    description: "Géométrie élégante, laque et chrome dans les intérieurs parisiens." },
  { name: "Moderne",      years: "1950 - 1969",          start: 1950, end: 1969,
    description: "Design fonctionnel, acier et verre dans la reconstruction." },
  { name: "Contemporain", years: "1990 - aujourd'hui",   start: 1990, end: 2030,
    description: "LED, impression 3D et matériaux durables réinventent l'éclairage." },
]

const CREAM     = "#f5f1e8"
const CREAM2    = "#ede9e0"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"

// ─── Section individuelle (parallaxe via IntersectionObserver) ────────────────

function PeriodSection({
  period, luminaires, index,
}: { period: Period; luminaires: any[]; index: number }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const router = useRouter()

  const periodLums = luminaires
    .filter((l: any) => {
      const y = parseInt(l.annee || l["Année"] || l.year)
      return !isNaN(y) && y >= period.start && y <= period.end && l.filename
    })
    .slice(0, 4)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={sectionRef}
      style={{ minHeight: "100vh", background: index % 2 === 0 ? CREAM : CREAM2,
               display: "flex", alignItems: "center", padding: "5rem 2rem" }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
           className="chrono-inner">

        {/* Gauche — texte */}
        <div style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? "translateY(0)" : "translateY(40px)",
          transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
        }} className="chrono-left">
          <div style={{ fontSize: "5rem", fontWeight: 700,
                        color: TEXT_DARK, opacity: 0.08,
                        lineHeight: 1, marginBottom: "0.25rem",
                        fontFamily: '"Playfair Display", Georgia, serif',
                        userSelect: "none" }}>
            {period.years.split(" ")[0]}
          </div>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif',
                       fontSize: "3rem", fontWeight: 600,
                       color: TEXT_DARK, margin: "0 0 0.75rem", lineHeight: 1.1 }}>
            {period.name}
          </h2>
          <p style={{ fontSize: "0.95rem", color: TEXT_MID,
                      marginBottom: "1.5rem", lineHeight: 1.6, maxWidth: "340px" }}>
            {period.description}
          </p>
          <Link
            href={`/luminaires?yearMin=${period.start}&yearMax=${period.end}`}
            style={{ fontSize: "0.9rem", color: BROWN, textDecoration: "none",
                     fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
          >
            Voir les luminaires →
          </Link>
        </div>

        {/* Droite — grille images */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
             className="chrono-right">
          {periodLums.length > 0
            ? periodLums.map((lum, li) => (
                <div
                  key={lum._id}
                  style={{
                    opacity:    visible ? 1 : 0,
                    transform:  visible ? "translateY(0)" : "translateY(30px)",
                    transition: `opacity 0.5s ease-out ${li * 100}ms, transform 0.5s ease-out ${li * 100}ms`,
                    borderRadius: "12px", overflow: "hidden", cursor: "pointer",
                  }}
                  onClick={() => router.push(`/luminaires/${lum._id}`)}
                >
                  <img
                    src={`/api/images/filename/${lum.filename}`}
                    alt={lum.nom || ""}
                    loading="lazy"
                    className="chrono-img"
                    style={{ width: "100%", aspectRatio: "3/4",
                             objectFit: "cover", display: "block" }}
                  />
                </div>
              ))
            : Array.from({ length: 4 }).map((_, li) => (
                <div key={li} style={{
                  aspectRatio: "3/4", borderRadius: "12px",
                  background: "#e8e0d0",
                  opacity:    visible ? 1 : 0,
                  transform:  visible ? "translateY(0)" : "translateY(30px)",
                  transition: `opacity 0.5s ease-out ${li * 100}ms, transform 0.5s ease-out ${li * 100}ms`,
                }} />
              ))
          }
        </div>

      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ChronoSection({ luminaires }: ChronoSectionProps) {
  return (
    <>
      <style>{`
        .chrono-inner {
          display: flex;
          gap: 4rem;
          align-items: center;
        }
        .chrono-left  { flex: 0 0 40%; }
        .chrono-right { flex: 1; }
        .chrono-img   { transition: transform 0.2s ease; }
        .chrono-img:hover { transform: scale(1.04); }
        .chrono-cta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: ${BROWN}; color: #fff;
          border-radius: 12px; font-weight: 500; font-size: 0.95rem;
          text-decoration: none; transition: background 0.2s;
        }
        .chrono-cta:hover { background: #75614a; }
        @media (max-width: 767px) {
          .chrono-inner { flex-direction: column !important; gap: 2rem !important; }
          .chrono-left  { flex: none !important; width: 100%; }
          .chrono-right { grid-template-columns: 1fr 1fr; width: 100%; }
          .chrono-right > div:nth-child(n+3) { display: none; }
        }
      `}</style>

      {/* En-tête */}
      <div style={{ background: CREAM, padding: "5rem 2rem 2.5rem", textAlign: "center" }}>
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

      {/* 9 sections parallaxe */}
      {PERIODS.map((period, i) => (
        <PeriodSection key={period.name} period={period} luminaires={luminaires} index={i} />
      ))}

      {/* Bouton global */}
      <div style={{ background: CREAM, padding: "3.5rem 2rem", textAlign: "center" }}>
        <Link href="/chronologie" className="chrono-cta">
          Explorer la chronologie complète →
        </Link>
      </div>

      {/* Séparateur */}
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ height: "1px",
                      background: "linear-gradient(to right, transparent, rgba(139,115,85,0.2), transparent)" }} />
      </div>
    </>
  )
}
