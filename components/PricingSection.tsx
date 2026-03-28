import Link from "next/link"

const CREAM     = "#f5f1e8"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"

const FREE_FEATURES = [
  "Accès aux fiches luminaires",
  "Recherche par nom et designer",
  "Consultation de la chronologie",
  "3 recherches IA par mois",
]

const PREMIUM_FEATURES = [
  "Collection complète de luminaires",
  "Recherche IA illimitée",
  "Suppression arrière-plan",
  "Export PDF des fiches",
  "Favoris et estimation de prix",
]

export function PricingSection() {
  return (
    <>
      <style>{`
        .pricing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          max-width: 860px;
          margin: 0 auto;
        }
        @media (max-width: 640px) {
          .pricing-grid { grid-template-columns: 1fr; }
        }
        .pricing-btn-outline {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 1.75rem;
          border: 1.5px solid ${BROWN}; color: ${BROWN};
          border-radius: 12px; font-weight: 500; font-size: 0.9rem;
          text-decoration: none; transition: all 0.2s;
          background: transparent;
        }
        .pricing-btn-outline:hover {
          background: ${BROWN}; color: #fff;
        }
        .pricing-btn-solid {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 1.75rem;
          background: ${BROWN}; color: #fff;
          border-radius: 12px; font-weight: 500; font-size: 0.9rem;
          text-decoration: none; transition: background 0.2s;
        }
        .pricing-btn-solid:hover { background: #6d5a40; }
      `}</style>

      <section style={{ background: CREAM, padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          {/* En-tête */}
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: BROWN,
                           textTransform: "uppercase", letterSpacing: "0.1em",
                           display: "block", marginBottom: "0.75rem" }}>
              Abonnement
            </span>
            <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif',
                         fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 600,
                         color: TEXT_DARK, margin: "0 0 1.25rem" }}>
              Débloquez tout le potentiel
            </h2>
            <p style={{ fontSize: "1rem", color: TEXT_MID,
                        maxWidth: "560px", margin: "0 auto", lineHeight: 1.7 }}>
              Avec l'abonnement Premium, accédez à l'intégralité de la collection, à la recherche IA
              illimitée, à la suppression d'arrière-plan, aux exports PDF et à bien d'autres
              fonctionnalités exclusives. Profitez de 2 mois offerts avec l'abonnement annuel.
            </p>
          </div>

          {/* Cartes */}
          <div className="pricing-grid">

            {/* ── CARTE FREE ── */}
            <div style={{ background: "#fff", borderRadius: "20px", padding: "2.5rem",
                          border: "1px solid #e0d8cc",
                          display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <span style={{ display: "inline-block", background: "#f0ebe0", color: BROWN,
                               fontSize: "0.72rem", fontWeight: 600,
                               padding: "0.3rem 0.9rem", borderRadius: "50px",
                               textTransform: "uppercase", letterSpacing: "0.06em",
                               marginBottom: "1rem" }}>
                  Gratuit
                </span>
                <div style={{ fontFamily: '"Playfair Display", Georgia, serif',
                              fontSize: "3.5rem", fontWeight: 700,
                              color: TEXT_DARK, lineHeight: 1 }}>
                  0€
                </div>
                <div style={{ fontSize: "0.85rem", color: TEXT_MID, marginTop: "0.25rem" }}>
                  /mois
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1 }}>
                {FREE_FEATURES.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center",
                                       gap: "0.6rem", fontSize: "0.9rem", color: TEXT_DARK }}>
                    <span style={{ color: BROWN, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/pricing" className="pricing-btn-outline">
                Commencer gratuitement →
              </Link>
            </div>

            {/* ── CARTE PREMIUM ── */}
            <div style={{ background: TEXT_DARK, borderRadius: "20px", padding: "2.5rem",
                          boxShadow: "0 8px 40px rgba(139,115,85,0.25)",
                          display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <span style={{ display: "inline-block", background: BROWN, color: "#fff",
                               fontSize: "0.72rem", fontWeight: 600,
                               padding: "0.3rem 0.9rem", borderRadius: "50px",
                               textTransform: "uppercase", letterSpacing: "0.06em",
                               marginBottom: "1rem" }}>
                  Recommandé
                </span>
                <div style={{ fontFamily: '"Playfair Display", Georgia, serif',
                              fontSize: "3.5rem", fontWeight: 700,
                              color: "#fff", lineHeight: 1 }}>
                  30€
                </div>
                <div style={{ fontSize: "0.85rem", color: "#c4a882", marginTop: "0.25rem" }}>
                  /mois
                </div>
                <div style={{ fontSize: "0.8rem", color: "#c4a882", marginTop: "0.5rem" }}>
                  Accès complet à toutes les fonctionnalités
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1 }}>
                {PREMIUM_FEATURES.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center",
                                       gap: "0.6rem", fontSize: "0.9rem", color: "#fff" }}>
                    <span style={{ color: "#c4a882", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/pricing" className="pricing-btn-solid">
                Voir les forfaits →
              </Link>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
