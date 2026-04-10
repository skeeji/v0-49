"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface GalleryLuminaire {
  _id:      string
  nom:      string
  designer: string
  annee:    string | number
  imageUrl: string
}

interface Zone {
  id:   number
  xPct: number
  yPct: number
  wPct: number
  hPct: number
}

// ─── Zones (% de l'image) — à recalibrer selon le PNG réel ──────────────────

const ZONES: Zone[] = [
  { id: 0, xPct:  2.0, yPct:  3.0, wPct: 14.0, hPct: 28.0 },
  { id: 1, xPct: 17.5, yPct:  2.0, wPct: 11.0, hPct: 22.0 },
  { id: 2, xPct: 30.0, yPct:  4.0, wPct: 13.0, hPct: 26.0 },
  { id: 3, xPct: 45.0, yPct:  2.0, wPct: 11.5, hPct: 20.0 },
  { id: 4, xPct: 58.0, yPct:  3.0, wPct: 13.0, hPct: 24.0 },
  { id: 5, xPct: 73.0, yPct:  2.5, wPct: 12.5, hPct: 22.0 },
  { id: 6, xPct: 74.0, yPct: 27.0, wPct: 13.0, hPct: 24.0 },
  { id: 7, xPct:  2.5, yPct: 33.0, wPct: 10.0, hPct: 20.0 },
]

const ROTATION_INTERVAL = 30_000
const ZONE_BG           = "#b8a898"

// ─── Utilitaires ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function pickRandom(pool: GalleryLuminaire[], n: number): GalleryLuminaire[] {
  if (pool.length === 0) return []
  const copy = [...pool]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  const result: GalleryLuminaire[] = []
  for (let i = 0; i < n; i++) result.push(copy[i % copy.length])
  return result
}

// ─── Tooltip musée ────────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: {
  lum:     GalleryLuminaire
  visible: boolean
  below:   boolean
}) {
  const pos       = below ? { top: "calc(100% + 6px)" } : { bottom: "calc(100% + 6px)" }
  const arrOut    = below
    ? { top: -7,  borderBottom: "7px solid #b8974a", borderTop: "none" }
    : { bottom: -7, borderTop: "7px solid #b8974a",  borderBottom: "none" }
  const arrIn     = below
    ? { top: -5,  borderBottom: "6px solid #f0e6c0", borderTop: "none" }
    : { bottom: -5, borderTop: "6px solid #f0e6c0",  borderBottom: "none" }

  return (
    <div className="pointer-events-none absolute z-50"
      style={{ ...pos, left: "50%", transform: "translateX(-50%)", minWidth: 150, maxWidth: 200,
               opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}>
      <div style={{ background: "linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)",
                    border: "1px solid #b8974a", borderRadius: 2, padding: "8px 10px",
                    boxShadow: "0 2px 10px rgba(0,0,0,.35)", position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)",
                      width: 0, height: 0, borderLeft: "7px solid transparent",
                      borderRight: "7px solid transparent", ...arrOut }} />
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)",
                      width: 0, height: 0, borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent", ...arrIn }} />
        <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 11,
                    fontWeight: 600, color: "#3d2b0a", lineHeight: 1.3 }}>{lum.nom}</p>
        {lum.designer && (
          <p style={{ fontFamily: "Georgia,serif", fontSize: 10, fontStyle: "italic",
                      color: "#6b4f1a", marginTop: 2 }}>{lum.designer}</p>
        )}
        {lum.annee && (
          <p style={{ fontFamily: "Georgia,serif", fontSize: 9, color: "#7a5c20",
                      marginTop: 1 }}>{lum.annee}</p>
        )}
        <Link href={`/luminaires/${lum._id}`} target="_blank" rel="noopener noreferrer"
          className="pointer-events-auto block mt-1"
          style={{ fontFamily: "Georgia,serif", fontSize: 9, color: "#5a3a10",
                   textDecoration: "underline" }}>
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function PaintingGallery({ transparentUrl }: { transparentUrl?: string }) {

  const [pool,        setPool]        = useState<GalleryLuminaire[]>([])
  const [currentLums, setCurrentLums] = useState<GalleryLuminaire[]>([])
  const [nextLums,    setNextLums]    = useState<GalleryLuminaire[]>([])
  const [fadingIn,    setFadingIn]    = useState(false)
  const [imgRatio,    setImgRatio]    = useState("1330 / 876")
  const [hovZone,     setHovZone]     = useState<number | null>(null)
  const [hovering,    setHovering]    = useState(false)
  const [hasPrev,     setHasPrev]     = useState(false)

  const historyRef  = useRef<GalleryLuminaire[][]>([])
  const currentRef  = useRef<GalleryLuminaire[]>([])
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const rotatingRef = useRef(false)

  // ── 1. Charger le pool ────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.luminaires.length > 0) {
          console.log(`[PaintingGallery] Pool : ${d.luminaires.length} luminaire(s)`)
          setPool(d.luminaires)
        }
      })
      .catch(() => {})
  }, [])

  // ── 2. Récupérer les dimensions de l'image (pour aspect-ratio) ────────────
  useEffect(() => {
    if (!transparentUrl) return
    const img = new Image()
    img.onload = () => setImgRatio(`${img.naturalWidth} / ${img.naturalHeight}`)
    img.src = transparentUrl
  }, [transparentUrl])

  // ── 3. Assignation initiale dès que le pool est dispo ────────────────────
  useEffect(() => {
    if (pool.length === 0 || currentRef.current.length > 0) return
    const sel = pickRandom(pool, ZONES.length)
    console.log(`[PaintingGallery] Assignation : ${sel.map((l, i) => `zone${i}→${l.nom}`).join(", ")}`)
    currentRef.current = sel
    historyRef.current = [sel]
    setCurrentLums(sel)
    setHasPrev(false)
  }, [pool])

  // ── 4. Rotation ───────────────────────────────────────────────────────────
  const doRotate = useCallback(async (dir: "next" | "prev") => {
    if (rotatingRef.current || pool.length === 0) return
    rotatingRef.current = true

    let sel: GalleryLuminaire[]
    if (dir === "next") {
      sel = pickRandom(pool, ZONES.length)
      historyRef.current = [...historyRef.current.slice(-10), sel]
    } else {
      const h = historyRef.current
      sel = h.length > 1 ? h[h.length - 2] : currentRef.current
      historyRef.current = h.length > 1 ? h.slice(0, -1) : h
    }
    setHasPrev(historyRef.current.length > 1)
    currentRef.current = sel

    setNextLums(sel)
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    setFadingIn(true)
    await sleep(850)
    setCurrentLums(sel)
    setFadingIn(false)
    setNextLums([])
    rotatingRef.current = false
  }, [pool])

  // ── 5. Timer auto ─────────────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => doRotate("next"), ROTATION_INTERVAL)
  }, [doRotate])

  useEffect(() => {
    if (pool.length === 0) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pool.length, resetTimer])

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (!transparentUrl) {
    return (
      <section className="w-full flex items-center justify-center bg-stone-100"
               style={{ minHeight: 180 }}>
        <p className="text-sm text-stone-400 font-serif italic">
          Uploadez le tableau depuis la page Import
        </p>
      </section>
    )
  }

  return (
    <section
      className="relative w-full select-none"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Conteneur principal avec ratio de l'image */}
      <div className="relative w-full" style={{ aspectRatio: imgRatio }}>

        {/* z-0 — fond neutre */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: ZONE_BG }} />

        {/* z-1 — luminaires dans chaque zone */}
        {ZONES.map((zone, i) => (
          <div key={zone.id}
            style={{
              position:        "absolute",
              left:            `${zone.xPct}%`,
              top:             `${zone.yPct}%`,
              width:           `${zone.wPct}%`,
              height:          `${zone.hPct}%`,
              zIndex:          1,
              backgroundColor: ZONE_BG,
              overflow:        "hidden",
            }}
          >
            {/* Image courante */}
            {currentLums[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentLums[i].imageUrl}
                alt=""
                draggable={false}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
              />
            )}
            {/* Image suivante (crossfade) */}
            {nextLums[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nextLums[i].imageUrl}
                alt=""
                draggable={false}
                style={{
                  position:   "absolute",
                  inset:      0,
                  width:      "100%",
                  height:     "100%",
                  objectFit:  "contain",
                  opacity:    fadingIn ? 1 : 0,
                  transition: fadingIn ? "opacity 0.8s ease" : "none",
                }}
              />
            )}
          </div>
        ))}

        {/* z-2 — PNG transparent (le tableau par-dessus) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={transparentUrl}
          alt=""
          draggable={false}
          style={{
            position:      "absolute",
            inset:         0,
            width:         "100%",
            height:        "100%",
            display:       "block",
            zIndex:        2,
            pointerEvents: "none",
          }}
        />

      </div>

      {/* Zones de survol (hors overflow pour que les tooltips ne soient pas clippés) */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
        {ZONES.map((zone, i) => {
          const lum   = currentLums[i]
          const below = zone.yPct < 40
          return (
            <div key={zone.id}
              className="absolute cursor-pointer"
              style={{
                left:          `${zone.xPct}%`,
                top:           `${zone.yPct}%`,
                width:         `${zone.wPct}%`,
                height:        `${zone.hPct}%`,
                pointerEvents: "auto",
              }}
              onMouseEnter={() => setHovZone(zone.id)}
              onMouseLeave={() => setHovZone(null)}
            >
              {lum && (
                <MuseumLabel lum={lum} visible={hovZone === zone.id} below={below} />
              )}
            </div>
          )
        })}
      </div>

      {/* Bouton précédent */}
      <button
        onClick={() => { resetTimer(); doRotate("prev") }}
        disabled={!hasPrev}
        aria-label="Sélection précédente"
        style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          zIndex: 10, width: 38, height: 38, borderRadius: "50%",
          background: "rgba(0,0,0,.28)", border: "none", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", backdropFilter: "blur(4px)",
          opacity: hovering ? (hasPrev ? 1 : 0.2) : 0, transition: "opacity .3s ease",
        }}
      >
        <ChevronLeft size={20} />
      </button>

      {/* Bouton suivant */}
      <button
        onClick={() => { resetTimer(); doRotate("next") }}
        aria-label="Sélection suivante"
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          zIndex: 10, width: 38, height: 38, borderRadius: "50%",
          background: "rgba(0,0,0,.28)", border: "none", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", backdropFilter: "blur(4px)",
          opacity: hovering ? 1 : 0, transition: "opacity .3s ease",
        }}
      >
        <ChevronRight size={20} />
      </button>

    </section>
  )
}
