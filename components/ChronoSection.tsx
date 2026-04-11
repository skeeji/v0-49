"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

interface Period {
  name:        string
  years:       string
  start:       number
  end:         number
  description: string
}

const PERIODS: Period[] = [
  { name: "Moyen-Âge",    years: "1000 — 1499", start: 1000, end: 1499,
    description: "Flambeaux, candélabres et lanternes des cathédrales gothiques." },
  { name: "Renaissance",  years: "1500 — 1599", start: 1500, end: 1599,
    description: "L'éclairage s'affine avec les lustres à bougie et les torchères." },
  { name: "Baroque",      years: "1600 — 1714", start: 1600, end: 1714,
    description: "Fastes du grand siècle, lustres de cristal et girandoles." },
  { name: "Néoclassique", years: "1715 — 1799", start: 1715, end: 1799,
    description: "Retour à l'antique, sobriété et harmonie des proportions." },
  { name: "Empire",       years: "1800 — 1850", start: 1800, end: 1850,
    description: "Dorures impériales, aigles et motifs guerriers dans l'éclairage." },
  { name: "Art Nouveau",  years: "1890 — 1910", start: 1890, end: 1910,
    description: "Formes organiques, vitraux colorés et motifs floraux de Gallé." },
  { name: "Art Déco",     years: "1920 — 1940", start: 1920, end: 1940,
    description: "Géométrie élégante, laque et chrome dans les intérieurs parisiens." },
  { name: "Moderne",      years: "1950 — 1979", start: 1950, end: 1979,
    description: "Design fonctionnel, acier et verre dans la reconstruction." },
  { name: "Contemporain", years: "1980 — aujourd'hui", start: 1980, end: 2030,
    description: "LED, impression 3D et matériaux durables réinventent l'éclairage." },
]

const CREAM     = "#f5f1e8"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"
const LINE_CLR  = "rgba(139,115,85,0.25)"

export function ChronoSection({ luminaires }: { luminaires: any[] }) {
  const router = useRouter()

  function getLuminaire(period: Period) {
    return luminaires.find((l: any) => {
      const y = parseInt(l.annee || l["Année"] || l.year)
      return !isNaN(y) && y >= period.start && y <= period.end && l.filename
    }) ?? null
  }

  return (
    <>
      <section style={{ background: CREAM, padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>

          {/* En-tête */}
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <span style={{
              fontSize: "0.78rem", fontWeight: 600, color: BROWN,
              textTransform: "uppercase", letterSpacing: "0.1em",
              display: "block", marginBottom: "0.75rem",
            }}>
              Chronologie
            </span>
          </div>

          {/* Timeline */}
          <div style={{ position: "relative" }}>

            {/* Ligne verticale centrale */}
            <div style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: "1px",
              background: `linear-gradient(to bottom, transparent, ${LINE_CLR} 8%, ${LINE_CLR} 92%, transparent)`,
              transform: "translateX(-50%)",
            }} />

            {PERIODS.map((period, i) => {
              const lum      = getLuminaire(period)
              const imgUrl   = lum?.filename ? `/api/images/filename/${lum.filename}` : null
              const isLeft   = i % 2 === 0   // image à gauche, texte à droite

              return (
                <div
                  key={period.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 48px 1fr",
                    alignItems: "center",
                    marginBottom: i < PERIODS.length - 1 ? "3.5rem" : 0,
                    gap: 0,
                  }}
                >
                  {/* Colonne gauche */}
                  {isLeft ? (
                    /* Image à gauche */
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "2rem" }}>
                      <div
                        onClick={() => lum && router.push(`/luminaires/${lum._id}`)}
                        style={{
                          width: 140, height: 140,
                          borderRadius: 4,
                          overflow: "hidden",
                          background: "#ede8de",
                          cursor: lum ? "pointer" : "default",
                          flexShrink: 0,
                        }}
                      >
                        {imgUrl && (
                          <img
                            src={imgUrl}
                            alt={lum?.nom || period.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            loading="lazy"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Texte à gauche */
                    <div style={{ textAlign: "right", paddingRight: "2rem" }}>
                      <p style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontSize: "1.25rem", fontWeight: 600,
                        color: TEXT_DARK, margin: "0 0 0.35rem",
                      }}>
                        {period.name}
                      </p>
                      <p style={{
                        fontSize: "0.82rem", color: TEXT_MID,
                        margin: "0 0 0.6rem", lineHeight: 1.55,
                      }}>
                        {period.description}
                      </p>
                      <Link
                        href={`/luminaires?yearMin=${period.start}&yearMax=${period.end}`}
                        style={{ fontSize: "0.78rem", color: BROWN, textDecoration: "none", fontWeight: 500 }}
                      >
                        Voir →
                      </Link>
                    </div>
                  )}

                  {/* Dot central + année */}
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    position: "relative",
                    zIndex: 1,
                  }}>
                    <div style={{
                      width: 12, height: 12,
                      borderRadius: "50%",
                      background: BROWN,
                      border: `2px solid ${CREAM}`,
                      boxShadow: `0 0 0 2px ${BROWN}`,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: "0.65rem",
                      fontFamily: "Georgia, serif",
                      color: BROWN,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}>
                      {period.years.split(" ")[0]}
                    </span>
                  </div>

                  {/* Colonne droite */}
                  {isLeft ? (
                    /* Texte à droite */
                    <div style={{ paddingLeft: "2rem" }}>
                      <p style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontSize: "1.25rem", fontWeight: 600,
                        color: TEXT_DARK, margin: "0 0 0.35rem",
                      }}>
                        {period.name}
                      </p>
                      <p style={{
                        fontSize: "0.82rem", color: TEXT_MID,
                        margin: "0 0 0.6rem", lineHeight: 1.55,
                      }}>
                        {period.description}
                      </p>
                      <Link
                        href={`/luminaires?yearMin=${period.start}&yearMax=${period.end}`}
                        style={{ fontSize: "0.78rem", color: BROWN, textDecoration: "none", fontWeight: 500 }}
                      >
                        Voir →
                      </Link>
                    </div>
                  ) : (
                    /* Image à droite */
                    <div style={{ paddingLeft: "2rem" }}>
                      <div
                        onClick={() => lum && router.push(`/luminaires/${lum._id}`)}
                        style={{
                          width: 140, height: 140,
                          borderRadius: 4,
                          overflow: "hidden",
                          background: "#ede8de",
                          cursor: lum ? "pointer" : "default",
                        }}
                      >
                        {imgUrl && (
                          <img
                            src={imgUrl}
                            alt={lum?.nom || period.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            loading="lazy"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
          .chrono-grid { grid-template-columns: 1fr 32px 1fr !important; }
          .chrono-img  { width: 90px !important; height: 90px !important; }
        }
      `}</style>
    </>
  )
}
