"use client"

import Link from "next/link"

interface Period {
  name:        string
  years:       string
  key:         string   // clé homepage_chronologie_N
  description: string
}

const PERIODS: Period[] = [
  { name: "Moyen-Âge",    years: "1000 — 1499", key: "homepage_chronologie_0",
    description: "Flambeaux, candélabres et lanternes des cathédrales gothiques." },
  { name: "Renaissance",  years: "1500 — 1599", key: "homepage_chronologie_1",
    description: "L'éclairage s'affine avec les lustres à bougie et les torchères." },
  { name: "Baroque",      years: "1600 — 1714", key: "homepage_chronologie_2",
    description: "Fastes du grand siècle, lustres de cristal et girandoles." },
  { name: "Néoclassique", years: "1715 — 1799", key: "homepage_chronologie_3",
    description: "Retour à l'antique, sobriété et harmonie des proportions." },
  { name: "Empire",       years: "1800 — 1850", key: "homepage_chronologie_4",
    description: "Dorures impériales, aigles et motifs guerriers dans l'éclairage." },
  { name: "Art Nouveau",  years: "1890 — 1910", key: "homepage_chronologie_5",
    description: "Formes organiques, vitraux colorés et motifs floraux de Gallé." },
  { name: "Art Déco",     years: "1920 — 1940", key: "homepage_chronologie_6",
    description: "Géométrie élégante, laque et chrome dans les intérieurs parisiens." },
  { name: "Moderne",      years: "1950 — 1979", key: "homepage_chronologie_7",
    description: "Design fonctionnel, acier et verre dans la reconstruction." },
  { name: "Contemporain", years: "1980 — aujourd'hui", key: "homepage_chronologie_8",
    description: "LED, impression 3D et matériaux durables réinventent l'éclairage." },
]

const CREAM     = "#f5f1e8"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"
const LINE_CLR  = "rgba(139,115,85,0.25)"

interface ChronoSectionProps {
  homepageImages: Record<string, string>
}

export function ChronoSection({ homepageImages }: ChronoSectionProps) {
  return (
    <>
      <section style={{ background: CREAM, padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>

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
              const imgUrl = homepageImages[period.key] ?? null
              const isLeft = i % 2 === 0

              return (
                <div
                  key={period.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 48px 1fr",
                    alignItems: "center",
                    marginBottom: i < PERIODS.length - 1 ? "3.5rem" : 0,
                  }}
                >
                  {/* Colonne gauche */}
                  {isLeft ? (
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "2rem" }}>
                      <Link href={`/luminaires?yearMin=${period.key}`} style={{ textDecoration: "none" }}>
                        <div style={{
                          width: 130, height: 130,
                          borderRadius: 3,
                          overflow: "hidden",
                          background: "#e8e2d8",
                          flexShrink: 0,
                        }}>
                          {imgUrl && (
                            <img src={imgUrl} alt={period.name} loading="lazy"
                              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                          )}
                        </div>
                      </Link>
                    </div>
                  ) : (
                    <div style={{ textAlign: "right", paddingRight: "2rem" }}>
                      <p style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontSize: "1.15rem", fontWeight: 600,
                        color: TEXT_DARK, margin: "0 0 0.3rem",
                      }}>{period.name}</p>
                      <p style={{ fontSize: "0.8rem", color: TEXT_MID, margin: "0 0 0.5rem", lineHeight: 1.55 }}>
                        {period.description}
                      </p>
                      <Link href={`/chronologie`}
                        style={{ fontSize: "0.76rem", color: BROWN, textDecoration: "none", fontWeight: 500 }}>
                        Voir →
                      </Link>
                    </div>
                  )}

                  {/* Dot + année */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, position:"relative", zIndex:1 }}>
                    <div style={{
                      width: 11, height: 11,
                      borderRadius: "50%",
                      background: BROWN,
                      border: `2px solid ${CREAM}`,
                      boxShadow: `0 0 0 2px ${BROWN}`,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: "0.62rem", fontFamily: "Georgia, serif",
                      color: BROWN, fontWeight: 600, letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                    }}>
                      {period.years.split(" ")[0]}
                    </span>
                  </div>

                  {/* Colonne droite */}
                  {isLeft ? (
                    <div style={{ paddingLeft: "2rem" }}>
                      <p style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontSize: "1.15rem", fontWeight: 600,
                        color: TEXT_DARK, margin: "0 0 0.3rem",
                      }}>{period.name}</p>
                      <p style={{ fontSize: "0.8rem", color: TEXT_MID, margin: "0 0 0.5rem", lineHeight: 1.55 }}>
                        {period.description}
                      </p>
                      <Link href={`/chronologie`}
                        style={{ fontSize: "0.76rem", color: BROWN, textDecoration: "none", fontWeight: 500 }}>
                        Voir →
                      </Link>
                    </div>
                  ) : (
                    <div style={{ paddingLeft: "2rem" }}>
                      <Link href={`/chronologie`} style={{ textDecoration: "none" }}>
                        <div style={{
                          width: 130, height: 130,
                          borderRadius: 3,
                          overflow: "hidden",
                          background: "#e8e2d8",
                        }}>
                          {imgUrl && (
                            <img src={imgUrl} alt={period.name} loading="lazy"
                              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                          )}
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </section>

      <style>{`
        @media (max-width: 600px) {
          .chrono-timeline { max-width: 100% !important; }
          .chrono-img      { width: 80px !important; height: 80px !important; }
        }
      `}</style>
    </>
  )
}
