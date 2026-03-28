"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LuminaireItem {
  _id: string
  imageUrl: string
  nom: string
}

interface CardData {
  id:        string
  startX:    number   // px depuis le centre de la section
  startY:    number   // px depuis le centre de la section
  driftX:    number   // px — valeur de --tx dans @keyframes
  driftY:    number   // px — valeur de --ty dans @keyframes
  width:     number   // px
  height:    number   // px
  duration:  number   // s
  delay:     number   // s (négatif → démarre en cours de cycle)
  maxOpacity: number  // 0.75 / 0.90 / 1.00 selon couche — valeur de --op
  zIndex:    number
  itemIndex: number   // round-robin dans items[]
}

// ─── PRNG déterministe (mulberry32) ───────────────────────────────────────────
// Zéro Math.random() direct → pas de hydration mismatch Next.js

function makePRNG(seed: number) {
  let s = seed | 0
  return (): number => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Définition des 3 couches ─────────────────────────────────────────────────

const ANGLES_DEG = [0, 45, 90, 135, 180, 225, 270, 315] // 8 directions en étoile

interface LayerDef {
  seed:       number
  imgWidth:   number  // largeur des cartes (px)
  duration:   number  // durée d'un cycle (s)
  maxOpacity: number  // opacité maximale pendant le plateau
  driftMag:   number  // distance totale de dérive (px)
  zIdx:       number
}

const LAYERS: LayerDef[] = [
  { seed: 42, imgWidth: 160, duration: 40, maxOpacity: 0.75, driftMag: 1200, zIdx: 1 },
  { seed: 43, imgWidth: 220, duration: 30, maxOpacity: 0.90, driftMag: 1350, zIdx: 2 },
  { seed: 44, imgWidth: 280, duration: 22, maxOpacity: 1.00, driftMag: 1500, zIdx: 3 },
]

// ─── Génération des 24 cartes (3 couches × 8 angles) ─────────────────────────
// Résultat identique côté serveur et côté client (seed fixe)

function buildCards(): CardData[] {
  const cards: CardData[] = []
  let globalIdx = 0

  LAYERS.forEach((layer, li) => {
    const rand = makePRNG(layer.seed)

    ANGLES_DEG.forEach((angleDeg, ai) => {
      const rad         = (angleDeg * Math.PI) / 180
      const startOffset = 100 + rand() * 80             // 100–180 px depuis centre

      // Position de départ : centre + offset dans la direction de dérive
      const startX = Math.cos(rad) * startOffset
      const startY = Math.sin(rad) * startOffset

      // Destination finale (hors écran dans la même direction)
      const driftX = Math.cos(rad) * layer.driftMag
      const driftY = Math.sin(rad) * layer.driftMag

      // Format portrait / carré / paysage selon index global
      const fmt = globalIdx % 3
      const w   = layer.imgWidth
      const height =
        fmt === 0 ? Math.round(w * 1.5)  // portrait
      : fmt === 1 ? w                    // carré
      :             Math.round(w * 0.7)  // paysage

      const delay = -(rand() * layer.duration) // départ désynchronisé

      cards.push({
        id:         `l${li}-a${ai}`,
        startX, startY, driftX, driftY,
        width: w, height,
        duration:   layer.duration,
        delay,
        maxOpacity: layer.maxOpacity,
        zIndex:     layer.zIdx,
        itemIndex:  globalIdx,
      })
      globalIdx++
    })
  })

  return cards
}

// ─── Constantes de style ──────────────────────────────────────────────────────

const CREAM      = "#f5f1e8"
const BROWN      = "#8b7355"
const BROWN_DARK = "#6d5a40"
const TEXT_DARK  = "#3d2b1f"

// ─── Composant ────────────────────────────────────────────────────────────────

export function FloatingGallery() {
  const router = useRouter()

  const [items,       setItems]       = useState<LuminaireItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // ── Fetch luminaires ───────────────────────────────────────────────────────
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

  // Configs stables grâce au seed fixe (useMemo évite tout recalcul)
  const cards = useMemo(() => buildCards(), [])

  // ── États intermédiaires ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        width: "100%", height: "100vh", background: CREAM,
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
        width: "100%", height: "100vh", background: CREAM,
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

  // ── Rendu principal ────────────────────────────────────────────────────────

  return (
    <>
      {/* ── CSS animations pures — aucune lib externe ── */}
      <style>{`

        /*
         * Animation principale : dérive radiale depuis le centre.
         *
         * --tx, --ty  : déplacement final en px (défini par carte via inline style)
         * --op        : opacité maximale du plateau (0.75 / 0.90 / 1.00 par couche)
         *
         * La propriété CSS custom property est lue au moment de l'exécution
         * de l'animation — valeur constante par élément, ce qui est voulu.
         */
        @keyframes fg-drift {
          0% {
            transform : translate(0px, 0px) scale(0.9);
            opacity   : 0;
          }
          10% {
            transform : translate(
              calc(var(--tx) * 0.10),
              calc(var(--ty) * 0.10)
            ) scale(1.0);
            opacity   : var(--op);
          }
          85% {
            transform : translate(
              calc(var(--tx) * 0.85),
              calc(var(--ty) * 0.85)
            ) scale(0.975);
            opacity   : var(--op);
          }
          100% {
            transform : translate(var(--tx), var(--ty)) scale(0.95);
            opacity   : 0;
          }
        }

        /*
         * .fg-card — wrapper animé (position absolue + dérive)
         * Gère uniquement l'animation ; aucun transform au hover
         * pour ne pas entrer en conflit avec @keyframes.
         */
        .fg-card {
          position                  : absolute;
          animation-name            : fg-drift;
          animation-timing-function : linear;
          animation-iteration-count : infinite;
          animation-fill-mode       : both;
          will-change               : transform, opacity;
        }

        /*
         * .fg-inner — couche visuelle imbriquée
         * Gère le rendu (border-radius, overflow, ombre, hover scale).
         * Séparé du wrapper animé pour que scale(1.04) ne
         * pertube pas le transform du keyframe.
         */
        .fg-inner {
          width         : 100%;
          height        : 100%;
          border-radius : 14px;
          overflow      : hidden;
          cursor        : pointer;
          box-shadow    : 0 4px 20px rgba(0, 0, 0, 0.06);
          transform     : scale(1);
          transition    : transform 0.2s ease, box-shadow 0.2s ease;
        }
        .fg-inner:hover {
          transform  : scale(1.04);
          box-shadow : 0 8px 28px rgba(0, 0, 0, 0.14);
        }
        .fg-inner img {
          width            : 100%;
          height           : 100%;
          object-fit       : cover;
          display          : block;
          pointer-events   : none;
          user-select      : none;
          -webkit-user-drag: none;
        }

        /* Fades sur les 4 bords — z-index 10 (au-dessus des cartes) */
        .fg-fade { position: absolute; pointer-events: none; z-index: 10; }
        .fg-fade-top {
          top: 0; left: 0; right: 0; height: 18%;
          background: linear-gradient(to bottom, ${CREAM} 0%, transparent 100%);
        }
        .fg-fade-bottom {
          bottom: 0; left: 0; right: 0; height: 18%;
          background: linear-gradient(to top, ${CREAM} 0%, transparent 100%);
        }
        .fg-fade-left {
          left: 0; top: 0; bottom: 0; width: 18%;
          background: linear-gradient(to right, ${CREAM} 0%, transparent 100%);
        }
        .fg-fade-right {
          right: 0; top: 0; bottom: 0; width: 18%;
          background: linear-gradient(to left, ${CREAM} 0%, transparent 100%);
        }

        /* Overlay central — z-index 20 */
        .fg-center {
          position               : absolute;
          top                    : 50%;
          left                   : 50%;
          transform              : translate(-50%, -50%);
          z-index                : 20;
          text-align             : center;
          padding                : 2.5rem 4rem;
          border-radius          : 20px;
          backdrop-filter        : blur(6px);
          -webkit-backdrop-filter: blur(6px);
          background             : rgba(245, 241, 232, 0.58);
        }
        .fg-title {
          font-family    : "Playfair Display", Georgia, serif;
          font-size      : 3rem;
          font-weight    : 600;
          color          : ${TEXT_DARK};
          letter-spacing : -0.02em;
          margin         : 0 0 0.5rem 0;
          white-space    : nowrap;
        }
        .fg-subtitle {
          font-family    : system-ui, -apple-system, sans-serif;
          font-size      : 0.8rem;
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

        @media (max-width: 767px) {
          .fg-center   { padding: 1.5rem 2rem; }
          .fg-title    { font-size: 1.7rem; white-space: normal; }
          .fg-subtitle { font-size: 0.72rem; }
          .fg-btn      { font-size: 0.88rem; padding: 0.7rem 1.6rem; }
          .fg-fade-top, .fg-fade-bottom { height: 12%; }
          .fg-fade-left, .fg-fade-right { width: 12%; }
        }
      `}</style>

      <section style={{
        width: "100%", height: "100vh",
        position: "relative", overflow: "hidden",
        background: CREAM,
      }}>

        {/* ── 24 cartes dérivantes (3 couches × 8 directions) ── */}
        {cards.map((card) => {
          const item     = items[card.itemIndex % items.length]
          const isPaused = hoveredCard === card.id

          return (
            <div
              key={card.id}
              className="fg-card"
              style={{
                // Centrage : 50%/50% de la section + offset de départ
                left      : `calc(50% + ${card.startX}px)`,
                top       : `calc(50% + ${card.startY}px)`,
                width     : `${card.width}px`,
                height    : `${card.height}px`,
                // Recentre la carte sur son point d'ancrage
                marginLeft: `${-card.width  / 2}px`,
                marginTop : `${-card.height / 2}px`,
                zIndex    : card.zIndex,
                // CSS custom properties consommées par @keyframes fg-drift
                "--tx": `${card.driftX}px`,
                "--ty": `${card.driftY}px`,
                "--op": String(card.maxOpacity),
                // Timing
                animationDuration : `${card.duration}s`,
                animationDelay    : `${card.delay}s`,
                // Pause individuelle au hover sur CETTE carte uniquement
                animationPlayState: isPaused ? "paused" : "running",
              } as React.CSSProperties}
            >
              <div
                className="fg-inner"
                onClick={() => router.push(`/luminaires/${item._id}`)}
                onMouseEnter={() => setHoveredCard(card.id)}
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
