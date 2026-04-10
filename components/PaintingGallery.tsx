"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────────

interface GalleryLuminaire {
  _id: string
  nom: string
  designer: string
  annee: string | number
  imageUrl: string
}

interface Zone {
  id:    number
  label: string
  left:  number   // % depuis le bord gauche
  top:   number   // % depuis le bord haut
  w:     number   // % largeur
  h:     number   // % hauteur
}

// ─── Zones hardcodées (calibrées sur le PNG transparent) ────────────────────────

const ZONES: Zone[] = [
  { id:  0, label: "Fenêtre haute gauche 1",      left:  1, top:  1, w: 10, h: 22 },
  { id:  1, label: "Fenêtre haute gauche 2",      left: 12, top:  1, w:  8, h: 22 },
  { id:  2, label: "Grande fenêtre gauche basse", left:  1, top: 24, w: 19, h: 28 },
  { id:  3, label: "Cadre centre-gauche haut",    left: 29, top:  1, w: 13, h: 26 },
  { id:  4, label: "Cadre centre-gauche milieu",  left: 29, top: 28, w:  8, h: 22 },
  { id:  5, label: "Cadre centre-gauche bas",     left: 38, top: 28, w:  7, h: 22 },
  { id:  6, label: "Cadre centre haut",           left: 43, top:  1, w: 14, h: 18 },
  { id:  7, label: "Fenêtre haute droite 1",      left: 61, top:  1, w:  9, h: 18 },
  { id:  8, label: "Fenêtre haute droite 2",      left: 71, top:  1, w:  8, h: 12 },
  { id:  9, label: "Fenêtre haute droite 3",      left: 80, top:  1, w: 10, h: 12 },
  { id: 10, label: "Fenêtre haute droite 4",      left: 91, top:  1, w:  8, h: 12 },
  { id: 11, label: "Cadre droite milieu",         left: 61, top: 20, w: 12, h: 20 },
  { id: 12, label: "Cadre droite bas",            left: 74, top: 14, w: 10, h: 18 },
  { id: 13, label: "Cadre incliné gauche",        left:  8, top: 38, w: 14, h: 22 },
  { id: 14, label: "Miroir ovale bas gauche",     left: 13, top: 62, w: 12, h: 18 },
  { id: 15, label: "Miroir ovale droite",         left: 59, top: 28, w: 13, h: 32 },
  { id: 16, label: "Fenêtres droite basse 1",     left: 91, top: 14, w:  8, h: 20 },
  { id: 17, label: "Fenêtres droite basse 2",     left: 80, top: 14, w: 10, h: 20 },
]

const ROTATION_INTERVAL = 30_000

// ─── Sélection sans doublons ─────────────────────────────────────────────────────

function pickRandom(pool: GalleryLuminaire[], n: number): GalleryLuminaire[] {
  if (pool.length === 0) return []
  const copy = [...pool]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  // pool >= n → n premiers tous distincts ; pool < n → doublons pour compléter
  const result: GalleryLuminaire[] = []
  for (let i = 0; i < n; i++) result.push(copy[i % copy.length])
  return result
}

// ─── Chargement image ───────────────────────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error(`Cannot load: ${src}`))
    img.src = src
  })
}

// ─── Suppression fond blanc sur canvas off-screen ────────────────────────────────

const TR = 0xe8, TG = 0xe0, TB = 0xd0   // cible : #e8e0d0 (beige chaud)

async function processLuminaireImage(url: string): Promise<string | null> {
  try {
    const img = await loadImg(url)
    const oc  = document.createElement("canvas")
    oc.width  = img.naturalWidth
    oc.height = img.naturalHeight
    const ctx = oc.getContext("2d")!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(img, 0, 0)

    const id = ctx.getImageData(0, 0, oc.width, oc.height)
    const d  = id.data
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]
      if (r > 220 && g > 220 && b > 220) {
        d[i] = TR; d[i + 1] = TG; d[i + 2] = TB
      } else {
        const m = Math.min(r, g, b)
        if (m > 190) {
          const t  = (m - 190) / 30
          d[i]     = Math.round(r * (1 - t) + TR * t)
          d[i + 1] = Math.round(g * (1 - t) + TG * t)
          d[i + 2] = Math.round(b * (1 - t) + TB * t)
        }
      }
    }
    ctx.putImageData(id, 0, 0)

    return new Promise<string | null>(res => {
      oc.toBlob(blob => res(blob ? URL.createObjectURL(blob) : null), "image/png")
    })
  } catch {
    return null
  }
}

// ─── Museum label ────────────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: { lum: GalleryLuminaire; visible: boolean; below: boolean }) {
  const pos       = below ? { top: "calc(100% + 6px)", bottom: "auto" } : { bottom: "calc(100% + 6px)", top: "auto" }
  const arrowOuter = below
    ? { top: -7, bottom: "auto", borderBottom: "7px solid #b8974a", borderTop: "none" }
    : { bottom: -7, top: "auto", borderTop: "7px solid #b8974a", borderBottom: "none" }
  const arrowInner = below
    ? { top: -5, bottom: "auto", borderBottom: "6px solid #f0e6c0", borderTop: "none" }
    : { bottom: -5, top: "auto", borderTop: "6px solid #f0e6c0", borderBottom: "none" }

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ ...pos, left: "50%", transform: "translateX(-50%)", minWidth: 150, maxWidth: 200, opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
    >
      <div style={{ background: "linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)", border: "1px solid #b8974a", borderRadius: 2, padding: "8px 10px", boxShadow: "0 2px 10px rgba(0,0,0,.35)", position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", ...arrowOuter }} />
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", ...arrowInner }} />
        <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 11, fontWeight: 600, color: "#3d2b0a", lineHeight: 1.3 }}>{lum.nom}</p>
        {lum.designer && <p style={{ fontFamily: "Georgia,serif", fontSize: 10, fontStyle: "italic", color: "#6b4f1a", marginTop: 2 }}>{lum.designer}</p>}
        {lum.annee    && <p style={{ fontFamily: "Georgia,serif", fontSize: 9,  color: "#7a5c20",  marginTop: 1  }}>{lum.annee}</p>}
        <Link
          href={`/luminaires/${lum._id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto block mt-1"
          style={{ fontFamily: "Georgia,serif", fontSize: 9, color: "#5a3a10", textDecoration: "underline" }}
        >
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────────

export function PaintingGallery({ transparentUrl }: { transparentUrl?: string }) {
  const paintingUrl = transparentUrl

  const [pool,          setPool]          = useState<GalleryLuminaire[]>([])
  const [current,       setCurrent]       = useState<GalleryLuminaire[]>([])
  const [processedUrls, setProcessedUrls] = useState<(string | null)[]>([])
  const [imgSize,       setImgSize]       = useState({ w: 1330, h: 560 })
  const [ready,         setReady]         = useState(false)
  const [hovZone,       setHovZone]       = useState<number | null>(null)
  const [hovering,      setHovering]      = useState(false)
  const [hasPrev,       setHasPrev]       = useState(false)

  const historyRef   = useRef<GalleryLuminaire[][]>([])
  const currentRef   = useRef<GalleryLuminaire[]>([])
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevBlobUrls = useRef<string[]>([])

  // ── Pool ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

  // ── Sélection initiale dès que le pool est disponible ────────────────────────────
  useEffect(() => {
    if (pool.length === 0 || currentRef.current.length > 0) return
    const sel = pickRandom(pool, ZONES.length)
    console.log("zones:", ZONES.length, "lums:", sel.length, sel.map(l => l?._id))
    currentRef.current = sel
    historyRef.current = [sel]
    setCurrent(sel)
    setHasPrev(false)
    setReady(true)
  }, [pool])

  // ── Traitement canvas off-screen à chaque changement de sélection ────────────────
  useEffect(() => {
    if (current.length === 0) { setProcessedUrls([]); return }
    let cancelled = false

    ;(async () => {
      const urls = await Promise.all(
        current.map(lum =>
          lum ? processLuminaireImage(lum.imageUrl).catch(() => null) : Promise.resolve(null)
        )
      )
      if (cancelled) { urls.forEach(u => u && URL.revokeObjectURL(u)); return }

      prevBlobUrls.current.forEach(u => URL.revokeObjectURL(u))
      prevBlobUrls.current = urls.filter((u): u is string => u !== null)
      setProcessedUrls(urls)
    })()

    return () => { cancelled = true }
  }, [current])

  // ── Rotation ──────────────────────────────────────────────────────────────────────
  const doRotate = useCallback((dir: "next" | "prev") => {
    if (pool.length === 0) return

    let sel: GalleryLuminaire[]
    if (dir === "next") {
      sel = pickRandom(pool, ZONES.length)
      historyRef.current = [...historyRef.current.slice(-10), sel]
    } else {
      const h = historyRef.current
      sel = h.length > 1 ? h[h.length - 2] : currentRef.current
      historyRef.current = h.length > 1 ? h.slice(0, -1) : h
    }
    console.log("zones:", ZONES.length, "lums:", sel.length, sel.map(l => l?._id))
    setHasPrev(historyRef.current.length > 1)
    currentRef.current = sel
    setCurrent(sel)
  }, [pool])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => doRotate("next"), ROTATION_INTERVAL)
  }, [doRotate])

  useEffect(() => {
    if (!ready || pool.length === 0) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [ready, pool.length, resetTimer])

  // ── Nettoyage blob URLs ───────────────────────────────────────────────────────────
  useEffect(() => () => { prevBlobUrls.current.forEach(u => URL.revokeObjectURL(u)) }, [])

  // ── Aspect ratio depuis le tableau chargé ────────────────────────────────────────
  const handlePaintingLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────────

  if (!paintingUrl) {
    return (
      <section className="w-full flex items-center justify-center bg-stone-100" style={{ minHeight: 180 }}>
        <p className="text-sm text-stone-400 font-serif italic">Uploadez le tableau depuis la page Import</p>
      </section>
    )
  }

  const { w: iW, h: iH } = imgSize

  return (
    <section
      className="relative w-full select-none"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${iW} / ${iH}` }}>

        {/* ── Cadres (frame-slot) — positionnés DERRIÈRE le tableau ── */}
        {ZONES.map((zone, i) => {
          const lum = current[i]
          const src = processedUrls[i] ?? lum?.imageUrl
          return (
            <div
              key={zone.id}
              className="frame-slot absolute"
              style={{
                left:            `${zone.left}%`,
                top:             `${zone.top}%`,
                width:           `${zone.w}%`,
                height:          `${zone.h}%`,
                backgroundColor: "#f5f0e8",
                zIndex:          1,
              }}
            >
              {lum && src && (
                <img
                  key={lum._id}
                  src={src}
                  alt={lum.nom}
                  style={{
                    objectFit: "contain",
                    width:     "100%",
                    height:    "100%",
                    padding:   "10%",
                    display:   "block",
                  }}
                />
              )}
            </div>
          )
        })}

        {/* ── Tableau RGBA au-dessus — les zones transparentes révèlent les cadres ── */}
        <img
          src={paintingUrl}
          alt="Tableau L'Enseigne de Gersaint"
          onLoad={handlePaintingLoad}
          className="absolute inset-0 w-full h-full block"
          style={{ objectFit: "fill", zIndex: 2 }}
        />

      </div>

      {/* ── Zones interactives hors overflow-hidden (tooltips non clippés) ── */}
      {ready && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
          {ZONES.map((zone, i) => {
            const lum   = current[i]
            const below = zone.top < 40
            return (
              <div
                key={zone.id}
                className="absolute cursor-pointer"
                style={{
                  left:          `${zone.left}%`,
                  top:           `${zone.top}%`,
                  width:         `${zone.w}%`,
                  height:        `${zone.h}%`,
                  pointerEvents: "auto",
                }}
                onMouseEnter={() => setHovZone(zone.id)}
                onMouseLeave={() => setHovZone(null)}
              >
                {lum && <MuseumLabel lum={lum} visible={hovZone === zone.id} below={below} />}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Boutons de navigation ── */}
      <button
        onClick={() => { resetTimer(); doRotate("prev") }}
        disabled={!hasPrev}
        aria-label="Sélection précédente"
        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,.28)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", opacity: hovering ? (hasPrev ? 1 : 0.2) : 0, transition: "opacity .3s ease" }}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        onClick={() => { resetTimer(); doRotate("next") }}
        aria-label="Sélection suivante"
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,.28)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", opacity: hovering ? 1 : 0, transition: "opacity .3s ease" }}
      >
        <ChevronRight size={20} />
      </button>

    </section>
  )
}
