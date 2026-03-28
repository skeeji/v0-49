"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// ─── Types ───────────────────────────────────────────────────────────────────

interface LuminaireItem {
  _id: string
  imageUrl: string
  nom: string
}

interface CardConfig {
  itemIndex: number
  startX:   number  // % from left  (30–70)
  startY:   number  // % from top   (25–75)
  driftX:   number  // px final translate X
  driftY:   number  // px final translate Y
  width:    number  // px
  height:   number  // px
  duration: number  // secondes (6–18)
  delay:    number  // secondes négatif → démarre en cours de cycle
}

// ─── Constantes de design ────────────────────────────────────────────────────

const CARD_COUNT = 12
const SEED       = 42           // seed fixe → même résultat serveur/client
const CREAM      = "#f5f1e8"
const BROWN      = "#8b7355"
const BROWN_DARK = "#6d5a40"
const TEXT_DARK  = "#3d2b1f"

// ─── PRNG déterministe (mulberry32) — zéro Math.random() ─────────────────────
// Évite les hydration mismatches Next.js

function makePRNG(seed: number) {
  let s = seed | 0
  return (): number => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Génération des 12 cartes (déterministe) ─────────────────────────────────

function generateCards(count: number): CardConfig[] {
  const rand  = makePRNG(SEED)
  const cards: CardConfig[] = []

  for (let i = 0; i < count; i++) {
    // Position de départ élargie autour du centre
    const startX = 20 + rand() * 60   // 20 – 80 %
    const startY = 15 + rand() * 70   // 15 – 85 %

    // Direction : radiale depuis le centre (50 %, 50 %) + bruit angulaire
    const cx        = startX - 50          // -30 … +30
    const cy        = startY - 50          // -35 … +35
    const magnitude = 600 + rand() * 400   // 600 – 1000 px
    const noise     = (rand() - 0.5) * 0.7 // bruit angulaire ± 0.35 rad
    const angle     = Math.atan2(cy, cx) + noise
    const driftX    = Math.cos(angle) * magnitude
    const driftY    = Math.sin(angle) * magnitude

    // Taille et format (portrait ou paysage)
    const isPortrait = rand() > 0.42
    const width      = Math.floor(150 + rand() * 130)  // 150 – 280 px
    const height     = isPortrait
      ? Math.floor(width * (1.2 + rand() * 0.6))       // 1.2× – 1.8×
      : Math.floor(width * (0.55 + rand() * 0.25))     // 0.55× – 0.8×

    // Vitesse et décalage
    const duration = 12 + rand() * 10    // 12 – 22 s
    const delay    = -(rand() * duration) // négatif → pas de "départ à zéro" synchronisé

    cards.push({ itemIndex: i, startX, startY, driftX, driftY, width, height, duration, delay })
  }
  return cards
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function FloatingGallery() {
  const router = useRouter()

  const [items,       setItems]       = useState<LuminaireItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(false)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  // ── Fetch luminaires ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
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
          filtered.length > 0 ? setItems(filtered) : setError(true)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Configs des cartes — stable grâce au seed fixe ────────────────────────
  const cards = useMemo(() => generateCards(CARD_COUNT), [])

  // ─── États intermédiaires ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ width: "100%", height: "100vh", background: CREAM,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: '"Playfair Display", Georgia, serif', color: BROWN, fontSize: "1.1rem" }}>
          Chargement…
        </p>
      </div>
    )
  }

  if (error || items.length === 0) {
    return (
      <div style={{ width: "100%", height: "100vh", background: CREAM,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', color: TEXT_DARK,
                       fontSize: "2.5rem", marginBottom: "1.5rem" }}>
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
        /*
         * Dérive depuis le centre vers l'extérieur.
         * --tx / --ty sont des CSS custom properties injectées
         * en inline style sur chaque carte (valeurs en px).
         * Les étapes intermédiaires créent le ease visuel
         * et les fades opacité entrée/sortie.
         */
        @keyframes fg-drift {
          0%   {
            transform : translate(0px, 0px) scale(1);
            opacity   : 0;
          }
          12%  {
            transform : translate(
              calc(var(--tx) * 0.05),
              calc(var(--ty) * 0.05)
            ) scale(1);
            opacity   : 1;
          }
          78%  {
            transform : translate(
              calc(var(--tx) * 0.78),
              calc(var(--ty) * 0.78)
            ) scale(0.93);
            opacity   : 1;
          }
          100% {
            transform : translate(var(--tx), var(--ty)) scale(0.85);
            opacity   : 0;
          }
        }

        /* Carte */
        .fg-card {
          position          : absolute;
          border-radius     : 12px;
          overflow          : hidden;
          cursor            : pointer;
          box-shadow        : 0 4px 18px rgba(0, 0, 0, 0.10);
          animation-name    : fg-drift;
          animation-timing-function  : ease-in;
          animation-iteration-count  : infinite;
          animation-fill-mode        : both;
          will-change       : transform, opacity;
          transition        : box-shadow 0.25s ease;
        }
        .fg-card:hover {
          box-shadow : 0 8px 28px rgba(0, 0, 0, 0.18);
        }
        .fg-card img {
          width           : 100%;
          height          : 100%;
          object-fit      : cover;
          display         : block;
          pointer-events  : none;
          user-select     : none;
          -webkit-user-drag: none;
        }

        /* Fades sur les 4 bords */
        .fg-fade          { position: absolute; pointer-events: none; z-index: 5; }
        .fg-fade-top      { top: 0; left: 0; right: 0; height: 20%;
                            background: linear-gradient(to bottom, ${CREAM} 0%, transparent 100%); }
        .fg-fade-bottom   { bottom: 0; left: 0; right: 0; height: 20%;
                            background: linear-gradient(to top, ${CREAM} 0%, transparent 100%); }
        .fg-fade-left     { top: 0; left: 0; bottom: 0; width: 15%;
                            background: linear-gradient(to right, ${CREAM} 0%, transparent 100%); }
        .fg-fade-right    { top: 0; right: 0; bottom: 0; width: 15%;
                            background: linear-gradient(to left, ${CREAM} 0%, transparent 100%); }

        /* Overlay central */
        .fg-center {
          position         : absolute;
          top              : 50%;
          left             : 50%;
          transform        : translate(-50%, -50%);
          z-index          : 10;
          text-align       : center;
          padding          : 2.25rem 3.5rem;
          border-radius    : 20px;
          backdrop-filter  : blur(4px);
          -webkit-backdrop-filter: blur(4px);
          background       : rgba(245, 241, 232, 0.58);
        }
        .fg-title {
          font-family    : "Playfair Display", Georgia, serif;
          font-size      : clamp(2rem, 4vw, 3.2rem);
          font-weight    : 600;
          color          : ${TEXT_DARK};
          letter-spacing : -0.02em;
          margin         : 0 0 0.5rem 0;
          white-space    : nowrap;
        }
        .fg-subtitle {
          font-family    : system-ui, -apple-system, sans-serif;
          font-size      : 0.85rem;
          color          : #7a6654;
          margin         : 0 0 1.75rem 0;
          font-weight    : 400;
          letter-spacing : 0.08em;
          text-transform : uppercase;
        }
        .fg-btn {
          display         : inline-block;
          padding         : 0.85rem 2.4rem;
          background      : ${BROWN};
          color           : #ffffff;
          border-radius   : 8px;
          font-family     : system-ui, -apple-system, sans-serif;
          font-size       : 0.95rem;
          font-weight     : 500;
          text-decoration : none;
          letter-spacing  : 0.01em;
          transition      : background 0.2s ease, transform 0.15s ease;
        }
        .fg-btn:hover {
          background : ${BROWN_DARK};
          transform  : translateY(-1px);
        }

        /* Mobile */
        @media (max-width: 767px) {
          .fg-center   { padding: 1.5rem 2rem; }
          .fg-title    { white-space: normal; font-size: 1.7rem; }
          .fg-subtitle { font-size: 0.75rem; }
          .fg-btn      { font-size: 0.88rem; padding: 0.7rem 1.6rem; }
          .fg-fade-top, .fg-fade-bottom { height: 15%; }
          .fg-fade-left, .fg-fade-right { width: 10%; }
        }
      `}</style>

      <section
        className="fg-section"
        style={{
          width     : "100%",
          height    : "100vh",
          position  : "relative",
          overflow  : "hidden",
          background: CREAM,
        }}
      >

        {/* ── 28 cartes dérivantes ── */}
        {cards.map((card, i) => {
          const item = items[card.itemIndex % items.length]
          return (
            <div
              key={i}
              className="fg-card"
              style={{
                left             : `${card.startX}%`,
                top              : `${card.startY}%`,
                width            : `${card.width}px`,
                height           : `${card.height}px`,
                // Centre la carte sur son point de départ
                marginLeft       : `${-card.width  / 2}px`,
                marginTop        : `${-card.height / 2}px`,
                // CSS custom properties utilisées dans @keyframes fg-drift
                "--tx"           : `${card.driftX}px`,
                "--ty"           : `${card.driftY}px`,
                animationDuration: `${card.duration}s`,
                animationDelay   : `${card.delay}s`,
                // Pause uniquement sur cette carte au hover
                animationPlayState: hoveredCard === i ? "paused" : "running",
              } as React.CSSProperties}
              onClick={() => router.push(`/luminaires/${item._id}`)}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              title={item.nom || undefined}
            >
              <img
                src={item.imageUrl}
                alt={item.nom || `Luminaire ${(card.itemIndex % items.length) + 1}`}
                loading="lazy"
                draggable={false}
              />
            </div>
          )
        })}

        {/* ── Fades 4 bords ── */}
        <div className="fg-fade fg-fade-top"    />
        <div className="fg-fade fg-fade-bottom" />
        <div className="fg-fade fg-fade-left"   />
        <div className="fg-fade fg-fade-right"  />

        {/* ── Overlay central ── */}
        <div className="fg-center">
          <h2 className="fg-title">Nos Luminaires</h2>
          <p  className="fg-subtitle">Du Moyen-Âge à nos jours</p>
          <Link href="/luminaires" className="fg-btn">
            Découvrir la collection →
          </Link>
        </div>

      </section>
    </>
  )
}
