"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GalleryLuminaire {
  _id: string
  nom: string
  designer: string
  annee: string | number
  imageUrl: string
}

interface Zone {
  id: number
  left: string
  top: string
  width: string
  height: string
  rotate?: number
  oval?: boolean
}

// ─── Zones vertes sur le tableau (coordonnées en % de l'image de fond) ─────────

const ZONES: Zone[] = [
  // Fenêtres gauche (2 panneaux groupés)
  { id: 1, left: "0.5%", top: "0.5%", width: "21%",  height: "27%" },
  // Fenêtre centre-gauche
  { id: 2, left: "22%",  top: "0.5%", width: "13%",  height: "27%" },
  // Grande zone droite (multi-panneaux)
  { id: 3, left: "56%",  top: "0.5%", width: "44%",  height: "36%" },
  // Cadre incliné porté par les hommes
  { id: 4, left: "1%",   top: "21%",  width: "19%",  height: "28%", rotate: -18 },
  // Cadre ovale dans la caisse (bas-gauche)
  { id: 5, left: "8%",   top: "43%",  width: "15%",  height: "22%", oval: true },
  // Grand miroir ovale (droite)
  { id: 6, left: "61%",  top: "25%",  width: "14%",  height: "30%", oval: true },
]

const ROTATION_INTERVAL = 30_000

// ─── Utilitaires ───────────────────────────────────────────────────────────────

function pickWithoutDuplicates(pool: GalleryLuminaire[], count: number): GalleryLuminaire[] {
  if (pool.length === 0) return []
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

// ─── Tooltip étiquette musée ────────────────────────────────────────────────────

function MuseumLabel({ luminaire, visible }: { luminaire: GalleryLuminaire; visible: boolean }) {
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
        minWidth: 150,
        maxWidth: 210,
        whiteSpace: "normal",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #f5e9c8 0%, #ede0b0 50%, #f0e6c0 100%)",
          border: "1px solid #b8974a",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3), inset 0 0 12px rgba(184,151,74,0.08)",
          borderRadius: 2,
          padding: "9px 11px",
          position: "relative",
        }}
      >
        {/* flèche basse */}
        <div style={{ position:"absolute", bottom:-7, left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", borderTop:"7px solid #b8974a" }} />
        <div style={{ position:"absolute", bottom:-5, left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", borderTop:"6px solid #f0e6c0" }} />

        <p style={{ fontFamily:"'Playfair Display', Georgia, serif", fontSize:11, fontWeight:600, color:"#3d2b0a", lineHeight:1.3, marginBottom:2 }}>
          {luminaire.nom}
        </p>
        {luminaire.designer && (
          <p style={{ fontFamily:"Georgia, serif", fontSize:10, fontStyle:"italic", color:"#6b4f1a", marginBottom:1 }}>
            {luminaire.designer}
          </p>
        )}
        {luminaire.annee && (
          <p style={{ fontFamily:"Georgia, serif", fontSize:9, color:"#7a5c20", marginBottom:4 }}>
            {luminaire.annee}
          </p>
        )}
        <Link
          href={`/luminaires/${luminaire._id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto"
          style={{ fontFamily:"Georgia, serif", fontSize:9, color:"#5a3a10", textDecoration:"underline", textUnderlineOffset:2 }}
        >
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Zone individuelle du tableau ───────────────────────────────────────────────

function PaintingZone({ zone, luminaire, visible }: { zone: Zone; luminaire: GalleryLuminaire | undefined; visible: boolean }) {
  const [hovered, setHovered]   = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError]   = useState(false)

  // Recalculate clip-path based on oval or rotate
  const clipPath = zone.oval
    ? "ellipse(50% 50% at 50% 50%)"
    : "inset(0)"         // forces clip even through CSS transform

  if (!luminaire) return null

  return (
    <div
      className="absolute cursor-pointer"
      style={{
        left:            zone.left,
        top:             zone.top,
        width:           zone.width,
        height:          zone.height,
        transform:       zone.rotate ? `rotate(${zone.rotate}deg)` : undefined,
        transformOrigin: "center center",
        overflow:        "hidden",
        clipPath,          // key: clips children regardless of transform
        zIndex:          2,
        opacity:         visible ? 1 : 0,
        transition:      "opacity 0.8s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Fond sombre neutre (remplace le vert chroma key) */}
      <div style={{ position:"absolute", inset:0, background:"#1a1208" }} />

      {/* Luminaire avec padding interne (ne touche pas les bords dorés) */}
      <div
        style={{
          position: "absolute",
          inset:    "8%",       // padding interne pour garder les bords dorés visibles
          display:  "flex",
          alignItems:    "center",
          justifyContent:"center",
        }}
      >
        {!imgError && (
          <img
            src={luminaire.imageUrl}
            alt={luminaire.nom}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{
              width:         "100%",
              height:        "100%",
              objectFit:     "contain",
              mixBlendMode:  "multiply",   // supprime les fonds blancs
              opacity:       imgLoaded ? 1 : 0,
              transition:    "opacity 0.4s ease",
              display:       "block",
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%" }}>
        <MuseumLabel luminaire={luminaire} visible={hovered && imgLoaded} />
      </div>
    </div>
  )
}

// ─── Composant principal ────────────────────────────────────────────────────────

export function PaintingGallery({ paintingUrl }: { paintingUrl?: string }) {
  const [pool,    setPool]    = useState<GalleryLuminaire[]>([])
  const [history, setHistory] = useState<GalleryLuminaire[][]>([])
  const [current, setCurrent] = useState<GalleryLuminaire[]>([])
  const [visible, setVisible] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [paintingLoaded, setPaintingLoaded] = useState(false)
  const [paintingError,  setPaintingError]  = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Charger les luminaires
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(data => { if (data.success) setPool(data.luminaires) })
      .catch(() => {})
  }, [])

  // Initialiser la première sélection
  useEffect(() => {
    if (pool.length > 0 && current.length === 0) {
      const sel = pickWithoutDuplicates(pool, ZONES.length)
      setCurrent(sel)
      setHistory([sel])
    }
  }, [pool, current.length])

  const rotate = useCallback((dir: "next" | "prev") => {
    if (pool.length === 0) return
    setVisible(false)
    setTimeout(() => {
      if (dir === "next") {
        const sel = pickWithoutDuplicates(pool, ZONES.length)
        setCurrent(sel)
        setHistory(h => [...h.slice(-10), sel])
      } else {
        setHistory(h => {
          if (h.length <= 1) return h
          const prev = h[h.length - 2]
          setCurrent(prev)
          return h.slice(0, -1)
        })
      }
      setVisible(true)
    }, 800)
  }, [pool])

  // Timer 30s
  useEffect(() => {
    if (pool.length === 0) return
    timerRef.current = setInterval(() => rotate("next"), ROTATION_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pool, rotate])

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => rotate("next"), ROTATION_INTERVAL)
  }

  const handleNext = () => { resetTimer(); rotate("next") }
  const handlePrev = () => { resetTimer(); rotate("prev") }

  // Placeholder si aucune image de fond configurée
  if (!paintingUrl) {
    return (
      <section className="w-full flex items-center justify-center bg-stone-100" style={{ minHeight: 220 }}>
        <p className="text-sm text-stone-400 font-serif italic">
          Galerie — uploadez le tableau depuis la page Import
        </p>
      </section>
    )
  }

  // Erreur de chargement de l'image de fond
  if (paintingError) {
    return (
      <section className="w-full flex items-center justify-center bg-stone-100" style={{ minHeight: 220 }}>
        <p className="text-sm text-red-400 font-serif italic">
          Erreur de chargement du tableau
        </p>
      </section>
    )
  }

  return (
    <section
      className="relative w-full select-none overflow-hidden"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative w-full" style={{ aspectRatio: "1330 / 876" }}>

        {/* Image du tableau (fond) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={paintingUrl}
          alt="Galerie de luminaires"
          onLoad={() => setPaintingLoaded(true)}
          onError={() => setPaintingError(true)}
          draggable={false}
          style={{
            position:   "absolute",
            inset:      0,
            width:      "100%",
            height:     "100%",
            objectFit:  "cover",
            display:    "block",
            opacity:    paintingLoaded ? 1 : 0,
            transition: "opacity 0.5s ease",
            zIndex:     1,
          }}
        />

        {/* Zones luminaires (z-index 2 — derrière l'image si on avait un masque) */}
        {paintingLoaded && ZONES.map((zone, i) => (
          <PaintingZone
            key={zone.id}
            zone={zone}
            luminaire={current[i]}
            visible={visible}
          />
        ))}

        {/* Flèche gauche */}
        <button
          onClick={handlePrev}
          disabled={history.length <= 1}
          aria-label="Sélection précédente"
          style={{
            position:   "absolute",
            left:       12,
            top:        "50%",
            transform:  "translateY(-50%)",
            zIndex:     10,
            width:      38,
            height:     38,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.25)",
            border:     "none",
            color:      "#fff",
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor:     "pointer",
            opacity:    hovering ? (history.length <= 1 ? 0.2 : 1) : 0,
            transition: "opacity 0.3s ease",
            backdropFilter: "blur(4px)",
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Flèche droite */}
        <button
          onClick={handleNext}
          aria-label="Sélection suivante"
          style={{
            position:   "absolute",
            right:      12,
            top:        "50%",
            transform:  "translateY(-50%)",
            zIndex:     10,
            width:      38,
            height:     38,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.25)",
            border:     "none",
            color:      "#fff",
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor:     "pointer",
            opacity:    hovering ? 1 : 0,
            transition: "opacity 0.3s ease",
            backdropFilter: "blur(4px)",
          }}
        >
          <ChevronRight size={20} />
        </button>

      </div>
    </section>
  )
}
