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
  borderRadius?: string
}

// ─── Zones vertes sur le tableau ───────────────────────────────────────────────
// Coordonnées en % de la taille de l'image de fond
// Estimées d'après image_28.png (peinture 18e siècle avec chroma key)

const ZONES: Zone[] = [
  // Fenêtres gauche (2 panneaux groupés)
  { id: 1, left: "0.5%", top: "0.5%", width: "21%", height: "27%" },
  // Fenêtre centre-gauche (1 panneau)
  { id: 2, left: "22%", top: "0.5%", width: "13%", height: "27%" },
  // Grande zone droite (plusieurs panneaux fenêtres)
  { id: 3, left: "56%", top: "0.5%", width: "44%", height: "36%" },
  // Cadre rectangulaire incliné (porté par les hommes, gauche)
  { id: 4, left: "1%", top: "21%", width: "19%", height: "28%", rotate: -18 },
  // Cadre ovale dans la caisse (bas-gauche)
  { id: 5, left: "8%", top: "43%", width: "15%", height: "22%", borderRadius: "50%" },
  // Grand miroir ovale (droite)
  { id: 6, left: "61%", top: "25%", width: "14%", height: "30%", borderRadius: "50%" },
]

const ROTATION_INTERVAL = 30_000

// ─── Utilitaires ───────────────────────────────────────────────────────────────

function pickWithoutDuplicates(pool: GalleryLuminaire[], count: number): GalleryLuminaire[] {
  if (pool.length === 0) return []
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const result: GalleryLuminaire[] = []
  for (const item of shuffled) {
    if (result.length >= count) break
    result.push(item)
  }
  return result
}

// ─── Sous-composant : tooltip étiquette musée ──────────────────────────────────

function MuseumLabel({ luminaire, visible }: { luminaire: GalleryLuminaire; visible: boolean }) {
  return (
    <div
      className="pointer-events-none absolute z-50 min-w-[160px] max-w-[220px]"
      style={{
        bottom: "calc(100% + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      {/* Étiquette papier vieilli */}
      <div
        style={{
          background: "linear-gradient(135deg, #f5e9c8 0%, #ede0b0 50%, #f0e6c0 100%)",
          border: "1px solid #b8974a",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25), inset 0 0 12px rgba(184,151,74,0.1)",
          borderRadius: "2px",
          padding: "10px 12px",
          position: "relative",
        }}
      >
        {/* Effet coin de papier */}
        <div
          style={{
            position: "absolute",
            bottom: -7,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: "7px solid #b8974a",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -5,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "6px solid #f0e6c0",
          }}
        />

        <p
          className="font-serif text-xs font-semibold leading-tight"
          style={{ color: "#3d2b0a", letterSpacing: "0.02em" }}
        >
          {luminaire.nom}
        </p>

        {luminaire.designer && (
          <p className="mt-1 text-xs italic" style={{ color: "#6b4f1a", fontFamily: "Georgia, serif" }}>
            {luminaire.designer}
          </p>
        )}

        {luminaire.annee && (
          <p className="mt-0.5 text-xs" style={{ color: "#7a5c20", fontFamily: "Georgia, serif", fontSize: "10px" }}>
            {luminaire.annee}
          </p>
        )}

        <Link
          href={`/luminaires/${luminaire._id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto mt-1.5 block text-xs underline underline-offset-2"
          style={{ color: "#5a3a10", fontFamily: "Georgia, serif", fontSize: "10px" }}
        >
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Sous-composant : une zone du tableau ──────────────────────────────────────

function PaintingZone({
  zone,
  luminaire,
  visible,
}: {
  zone: Zone
  luminaire: GalleryLuminaire | undefined
  visible: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  if (!luminaire) return null

  const transform = zone.rotate ? `rotate(${zone.rotate}deg)` : undefined

  return (
    <div
      className="absolute overflow-hidden cursor-pointer"
      style={{
        left: zone.left,
        top: zone.top,
        width: zone.width,
        height: zone.height,
        transform,
        transformOrigin: "center center",
        borderRadius: zone.borderRadius,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease",
        zIndex: 2,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image du luminaire */}
      <img
        src={luminaire.imageUrl}
        alt={luminaire.nom}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: imgLoaded ? 1 : 0,
          transition: "opacity 0.4s ease",
          display: "block",
        }}
      />

      {/* Tooltip étiquette musée */}
      <MuseumLabel luminaire={luminaire} visible={hovered && imgLoaded} />
    </div>
  )
}

// ─── Composant principal ────────────────────────────────────────────────────────

interface PaintingGalleryProps {
  paintingUrl?: string
}

export function PaintingGallery({ paintingUrl }: PaintingGalleryProps) {
  const [pool, setPool] = useState<GalleryLuminaire[]>([])
  const [history, setHistory] = useState<GalleryLuminaire[][]>([])
  const [current, setCurrent] = useState<GalleryLuminaire[]>([])
  const [visible, setVisible] = useState(true)
  const [hoveringImage, setHoveringImage] = useState(false)
  const [paintingLoaded, setPaintingLoaded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Charger le pool de luminaires
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.luminaires.length > 0) {
          setPool(data.luminaires)
        }
      })
      .catch(() => {})
  }, [])

  // Initialiser la sélection dès que le pool est disponible
  useEffect(() => {
    if (pool.length > 0 && current.length === 0) {
      const sel = pickWithoutDuplicates(pool, ZONES.length)
      setCurrent(sel)
      setHistory([sel])
    }
  }, [pool, current.length])

  // Rotation automatique
  const rotate = useCallback(
    (direction: "next" | "prev") => {
      if (pool.length === 0) return

      setVisible(false)

      setTimeout(() => {
        if (direction === "next") {
          const sel = pickWithoutDuplicates(pool, ZONES.length)
          setCurrent(sel)
          setHistory((h) => [...h.slice(-10), sel])
        } else {
          setHistory((h) => {
            if (h.length <= 1) return h
            const prev = h[h.length - 2]
            setCurrent(prev)
            return h.slice(0, -1)
          })
        }
        setVisible(true)
      }, 800)
    },
    [pool]
  )

  // Timer 30s
  useEffect(() => {
    if (pool.length === 0) return
    timerRef.current = setInterval(() => rotate("next"), ROTATION_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pool, rotate])

  const handleNext = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    rotate("next")
    timerRef.current = setInterval(() => rotate("next"), ROTATION_INTERVAL)
  }

  const handlePrev = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    rotate("prev")
    timerRef.current = setInterval(() => rotate("next"), ROTATION_INTERVAL)
  }

  if (!paintingUrl) return null

  return (
    <section
      className="relative w-full select-none"
      onMouseEnter={() => setHoveringImage(true)}
      onMouseLeave={() => setHoveringImage(false)}
    >
      {/* Conteneur image de fond */}
      <div className="relative w-full" style={{ aspectRatio: "1330 / 876" }}>

        {/* Image du tableau (fond) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={paintingUrl}
          alt="Galerie de luminaires"
          onLoad={() => setPaintingLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
            opacity: paintingLoaded ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Zones luminaires superposées */}
        {paintingLoaded &&
          ZONES.map((zone, i) => (
            <PaintingZone
              key={zone.id}
              zone={zone}
              luminaire={current[i]}
              visible={visible}
            />
          ))}

        {/* Flèche gauche (précédent) */}
        <button
          onClick={handlePrev}
          disabled={history.length <= 1}
          aria-label="Sélection précédente"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/40 disabled:opacity-20"
          style={{
            width: 38,
            height: 38,
            opacity: hoveringImage ? 1 : 0,
            transition: "opacity 0.3s ease",
            pointerEvents: hoveringImage ? "auto" : "none",
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Flèche droite (suivant) */}
        <button
          onClick={handleNext}
          aria-label="Sélection suivante"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/40"
          style={{
            width: 38,
            height: 38,
            opacity: hoveringImage ? 1 : 0,
            transition: "opacity 0.3s ease",
            pointerEvents: hoveringImage ? "auto" : "none",
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  )
}
