"use client"

import Link from "next/link"

interface Period {
  name:        string
  years:       string
  key:         string
  description: string
  chronoId:    string
}

const PERIODS: Period[] = [
  { name: "Moyen-Âge",    years: "1000 — 1499", key: "homepage_chronologie_0",
    description: "Flambeaux, candélabres et lanternes des cathédrales gothiques.",
    chronoId: "Moyen-Age" },
  { name: "Renaissance",  years: "1500 — 1599", key: "homepage_chronologie_1",
    description: "L'éclairage s'affine avec les lustres à bougie et les torchères.",
    chronoId: "XVIe siècle" },
  { name: "Baroque",      years: "1600 — 1714", key: "homepage_chronologie_2",
    description: "Fastes du grand siècle, lustres de cristal et girandoles.",
    chronoId: "XVIIe siècle" },
  { name: "Néoclassique", years: "1715 — 1799", key: "homepage_chronologie_3",
    description: "Retour à l'antique, sobriété et harmonie des proportions.",
    chronoId: "XVIIIe siècle" },
  { name: "Empire",       years: "1800 — 1850", key: "homepage_chronologie_4",
    description: "Dorures impériales, aigles et motifs guerriers dans l'éclairage.",
    chronoId: "XIXe siècle" },
  { name: "Art Nouveau",  years: "1890 — 1910", key: "homepage_chronologie_5",
    description: "Formes organiques, vitraux colorés et motifs floraux de Gallé.",
    chronoId: "Art Nouveau" },
  { name: "Art Déco",     years: "1920 — 1940", key: "homepage_chronologie_6",
    description: "Géométrie élégante, laque et chrome dans les intérieurs parisiens.",
    chronoId: "Art Déco" },
  { name: "Moderne",      years: "1950 — 1979", key: "homepage_chronologie_7",
    description: "Design fonctionnel, acier et verre dans la reconstruction.",
    chronoId: "1950 - 1959" },
  { name: "Contemporain", years: "1980 — aujourd'hui", key: "homepage_chronologie_8",
    description: "LED, impression 3D et matériaux durables réinventent l'éclairage.",
    chronoId: "1980 - 1989" },
]

const CREAM    = "#f5f1e8"
const BROWN    = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"
const LINE_CLR  = "rgba(139,115,85,0.18)"

interface ChronoSectionProps {
  homepageImages: Record<string, string>
}

export function ChronoSection({ homepageImages }: ChronoSectionProps) {
  return (
    <>
      <style>{`
        /* ── Images ── */
        .chrono-img-wrap {
          overflow: hidden; border-radius: 2px; background: #e8e2d8; flex-shrink: 0;
        }
        .chrono-img-wrap img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.55s ease;
        }
        .chrono-row:hover .chrono-img-wrap img { transform: scale(1.06); }

        /* ── Lien titre ── */
        .chrono-period-link { text-decoration: none; color: inherit; transition: color 0.2s ease; }
        .chrono-period-link:hover { color: ${BROWN}; }

        /* ── Layout desktop : grille 3 colonnes ── */
        .chrono-row {
          display: grid;
          grid-template-columns: 1fr 44px 1fr;
          align-items: center;
        }
        .chrono-col-left  { display: block; }
        .chrono-col-dot   { display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; }
        .chrono-col-right { display: block; }
        .chrono-mobile    { display: none; }

        /* ── Layout mobile : ligne gauche + contenu ── */
        @media (max-width: 600px) {
          .chrono-row {
            grid-template-columns: 32px 1fr;
          }
          .chrono-col-left  { display: none; }
          .chrono-col-right { display: none; }
          .chrono-mobile    { display: flex; align-items: flex-start; gap: 0.75rem; padding-left: 0.5rem; }
        }
      `}</style>

      <section style={{ background: CREAM, padding: "5rem 1.5rem 6rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ position: "relative" }}>

            {/* Ligne verticale — desktop : centre, mobile : gauche */}
            <div className="chrono-vline-desktop" style={{
              position: "absolute",
              left: "50%",
              top: 0, bottom: 0,
              width: "1px",
              background: `linear-gradient(to bottom, transparent, ${LINE_CLR} 6%, ${LINE_CLR} 94%, transparent)`,
              transform: "translateX(-50%)",
            }} />
            <style>{`
              @media (max-width: 600px) {
                .chrono-vline-desktop {
                  left: 14px !important;
                  transform: none !important;
                }
              }
            `}</style>

            {PERIODS.map((period, i) => {
              const imgUrl     = homepageImages[period.key] ?? null
              const isLeft     = i % 2 === 0
              const isLast     = i === PERIODS.length - 1
              const chronoHref = `/chronologie#${encodeURIComponent(period.chronoId)}`

              const TextBlock = ({ align }: { align: "left" | "right" }) => (
                <div style={align === "left"
                  ? { paddingLeft: "2.2rem" }
                  : { paddingRight: "2.2rem", textAlign: "right" }
                }>
                  <Link href={chronoHref} className="chrono-period-link">
                    <p style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: "1.05rem", fontWeight: 600,
                      color: TEXT_DARK, margin: "0 0 0.25rem", lineHeight: 1.2,
                    }}>{period.name}</p>
                  </Link>
                  <p style={{
                    fontFamily: "Georgia, serif", fontSize: "0.68rem",
                    color: BROWN, margin: "0 0 0.4rem", letterSpacing: "0.05em",
                  }}>{period.years}</p>
                  <p style={{
                    fontSize: "0.78rem", color: TEXT_MID, margin: 0, lineHeight: 1.6,
                    maxWidth: 240, ...(align === "right" ? { marginLeft: "auto" } : {}),
                  }}>{period.description}</p>
                </div>
              )

              const ImgBlock = ({ side }: { side: "left" | "right" }) => (
                <Link href={chronoHref} style={{
                  textDecoration: "none",
                  display: "flex",
                  justifyContent: side === "left" ? "flex-end" : "flex-start",
                  paddingRight: side === "left" ? "2.2rem" : 0,
                  paddingLeft:  side === "right" ? "2.2rem" : 0,
                }}>
                  <div className="chrono-img-wrap" style={{ width: 148, height: 185 }}>
                    {imgUrl && <img src={imgUrl} alt={period.name} loading="lazy" />}
                  </div>
                </Link>
              )

              return (
                <div
                  key={period.name}
                  className="chrono-row"
                  style={{ marginBottom: isLast ? 0 : "3rem" }}
                >
                  {/* Colonne gauche — desktop uniquement */}
                  <div className="chrono-col-left">
                    {isLeft ? <ImgBlock side="left" /> : <TextBlock align="right" />}
                  </div>

                  {/* Dot central */}
                  <div className="chrono-col-dot">
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: BROWN, border: `1.5px solid ${CREAM}`,
                      boxShadow: `0 0 0 2px ${BROWN}`, flexShrink: 0,
                    }} />
                  </div>

                  {/* Colonne droite — desktop uniquement */}
                  <div className="chrono-col-right">
                    {isLeft ? <TextBlock align="left" /> : <ImgBlock side="right" />}
                  </div>

                  {/* Contenu mobile — image + texte côte à côte */}
                  <div className="chrono-mobile">
                    {imgUrl && (
                      <Link href={chronoHref} style={{ textDecoration: "none", flexShrink: 0 }}>
                        <div className="chrono-img-wrap" style={{ width: 64, height: 80 }}>
                          <img src={imgUrl} alt={period.name} loading="lazy" />
                        </div>
                      </Link>
                    )}
                    <div>
                      <Link href={chronoHref} className="chrono-period-link">
                        <p style={{
                          fontFamily: '"Playfair Display", Georgia, serif',
                          fontSize: "0.95rem", fontWeight: 600,
                          color: TEXT_DARK, margin: "0 0 0.2rem", lineHeight: 1.2,
                        }}>{period.name}</p>
                      </Link>
                      <p style={{
                        fontFamily: "Georgia, serif", fontSize: "0.65rem",
                        color: BROWN, margin: "0 0 0.3rem", letterSpacing: "0.04em",
                      }}>{period.years}</p>
                      <p style={{
                        fontSize: "0.75rem", color: TEXT_MID, margin: 0, lineHeight: 1.55,
                      }}>{period.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
