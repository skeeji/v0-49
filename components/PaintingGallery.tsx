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

interface FrameZone {
  id: number
  bbox: { x: number; y: number; w: number; h: number }
}

// ─── Constantes ─────────────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 30_000
const MIN_ZONE_PIXELS   = 400
const MAX_ZONE_FRACTION = 0.30   // ignore zones couvrant >30% de l'image (fond)

// ─── Utilitaires purs ───────────────────────────────────────────────────────────

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

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error(`Cannot load: ${src}`))
    img.src     = src
  })
}

// ─── Détection des zones transparentes (canal alpha) ────────────────────────────

function detectTransparentZones(data: Uint8ClampedArray, W: number, H: number): FrameZone[] {
  const visited = new Uint8Array(W * H)
  const rawZones: FrameZone[] = []
  const totalPx = W * H

  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const si = sy * W + sx
      if (visited[si]) continue
      if (data[si * 4 + 3] >= 128) continue   // pixel opaque → pas un cadre

      const pixels: number[] = []
      const q: number[] = [si]
      visited[si] = 1
      let qi = 0

      while (qi < q.length) {
        const ci = q[qi++]
        pixels.push(ci)
        const cy = (ci / W) | 0
        const cx = ci % W
        if (cx > 0)     { const n = ci - 1; if (!visited[n] && data[n*4+3] < 128) { visited[n]=1; q.push(n) } }
        if (cx < W - 1) { const n = ci + 1; if (!visited[n] && data[n*4+3] < 128) { visited[n]=1; q.push(n) } }
        if (cy > 0)     { const n = ci - W; if (!visited[n] && data[n*4+3] < 128) { visited[n]=1; q.push(n) } }
        if (cy < H - 1) { const n = ci + W; if (!visited[n] && data[n*4+3] < 128) { visited[n]=1; q.push(n) } }
      }

      if (pixels.length < MIN_ZONE_PIXELS) continue
      if (pixels.length > totalPx * MAX_ZONE_FRACTION) continue  // ignore le fond global

      let x0 = W, x1 = 0, y0 = H, y1 = 0
      for (const pi of pixels) {
        const py = (pi / W) | 0, px = pi % W
        if (px < x0) x0 = px; if (px > x1) x1 = px
        if (py < y0) y0 = py; if (py > y1) y1 = py
      }

      rawZones.push({ id: rawZones.length, bbox: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } })
    }
  }

  // Fusion des bounding-boxes qui se chevauchent (corrige le cadre ovale détecté en 2 zones)
  const merged = mergeOverlappingZones(rawZones)

  // Réindexation + tri top→bottom, left→right
  return merged
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
    .map((z, i) => ({ ...z, id: i }))
}

function mergeOverlappingZones(zones: FrameZone[]): FrameZone[] {
  const list = zones.map(z => ({ ...z, bbox: { ...z.bbox } }))
  let changed = true
  while (changed) {
    changed = false
    outer: for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i].bbox, b = list[j].bbox
        // Les deux bounding-boxes se chevauchent ?
        if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
          const x0 = Math.min(a.x, b.x)
          const y0 = Math.min(a.y, b.y)
          const x1 = Math.max(a.x + a.w, b.x + b.w)
          const y1 = Math.max(a.y + a.h, b.y + b.h)
          list[i] = { id: list[i].id, bbox: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }
          list.splice(j, 1)
          changed = true
          break outer
        }
      }
    }
  }
  return list
}

// ─── Museum label ────────────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: { lum: GalleryLuminaire; visible: boolean; below: boolean }) {
  const pos = below
    ? { top: "calc(100% + 6px)", bottom: "auto" }
    : { bottom: "calc(100% + 6px)", top: "auto" }

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
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", ...arrowOuter }} />
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", ...arrowInner }} />
        <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:11, fontWeight:600, color:"#3d2b0a", lineHeight:1.3 }}>{lum.nom}</p>
        {lum.designer && <p style={{ fontFamily:"Georgia,serif", fontSize:10, fontStyle:"italic", color:"#6b4f1a", marginTop:2 }}>{lum.designer}</p>}
        {lum.annee    && <p style={{ fontFamily:"Georgia,serif", fontSize:9,  color:"#7a5c20",  marginTop:1  }}>{lum.annee}</p>}
        <Link
          href={`/luminaires/${lum._id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto block mt-1"
          style={{ fontFamily:"Georgia,serif", fontSize:9, color:"#5a3a10", textDecoration:"underline" }}
        >
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────────

export function PaintingGallery({ paintingUrl }: { paintingUrl?: string }) {

  const [pool,     setPool]     = useState<GalleryLuminaire[]>([])
  const [current,  setCurrent]  = useState<GalleryLuminaire[]>([])
  const [zones,    setZones]    = useState<FrameZone[]>([])
  const [imgSize,  setImgSize]  = useState({ w: 1330, h: 876 })
  const [phase,    setPhase]    = useState<"idle"|"loading"|"detecting"|"ready"|"error">("idle")
  const [hovZone,  setHovZone]  = useState<number | null>(null)
  const [hovering, setHovering] = useState(false)
  const [hasPrev,  setHasPrev]  = useState(false)

  const historyRef = useRef<GalleryLuminaire[][]>([])
  const currentRef = useRef<GalleryLuminaire[]>([])
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const zonesRef   = useRef<FrameZone[]>([])

  // Chargement du pool de luminaires
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

  // Chargement + détection des zones transparentes
  useEffect(() => {
    if (!paintingUrl) return
    let cancelled = false

    ;(async () => {
      try {
        setPhase("loading")

        const img = await loadImg(paintingUrl)
        if (cancelled) return

        const W = img.naturalWidth, H = img.naturalHeight
        setImgSize({ w: W, h: H })

        const tmp = document.createElement("canvas")
        tmp.width = W; tmp.height = H
        tmp.getContext("2d")!.drawImage(img, 0, 0)
        const { data } = tmp.getContext("2d")!.getImageData(0, 0, W, H)

        setPhase("detecting")
        const detectedZones = detectTransparentZones(data, W, H)
        console.log(`[PaintingGallery] ${detectedZones.length} zone(s)`, detectedZones.map(z => `#${z.id} ${z.bbox.w}×${z.bbox.h}`))

        if (cancelled) return
        zonesRef.current = detectedZones
        setZones(detectedZones)
        setPhase("ready")
      } catch (e) {
        console.error("PaintingGallery:", e)
        if (!cancelled) setPhase("error")
      }
    })()

    return () => { cancelled = true }
  }, [paintingUrl])

  // Sélection initiale dès que pool ET zones sont prêts
  useEffect(() => {
    if (pool.length === 0 || zonesRef.current.length === 0 || currentRef.current.length > 0) return
    const sel = pickRandom(pool, zonesRef.current.length)
    currentRef.current = sel
    historyRef.current = [sel]
    setCurrent(sel)
    setHasPrev(false)
  }, [pool, zones])

  // Rotation suivant / précédent
  const doRotate = useCallback((dir: "next" | "prev") => {
    const zns = zonesRef.current
    if (zns.length === 0 || pool.length === 0) return

    let sel: GalleryLuminaire[]
    if (dir === "next") {
      sel = pickRandom(pool, zns.length)
      historyRef.current = [...historyRef.current.slice(-10), sel]
    } else {
      const h = historyRef.current
      sel = h.length > 1 ? h[h.length - 2] : currentRef.current
      historyRef.current = h.length > 1 ? h.slice(0, -1) : h
    }
    setHasPrev(historyRef.current.length > 1)
    currentRef.current = sel
    setCurrent(sel)
  }, [pool])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => doRotate("next"), ROTATION_INTERVAL)
  }, [doRotate])

  useEffect(() => {
    if (phase !== "ready" || pool.length === 0) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, pool.length, resetTimer])

  // ── Rendu ─────────────────────────────────────────────────────────────────────────

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
      {/* Conteneur principal — overflow-hidden pour clipper les cadres */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${iW} / ${iH}` }}>

        {/* ── Cadres (frame-slot) positionnés DERRIÈRE le tableau ── */}
        {zones.map((zone, i) => {
          const lum = current[i]
          return (
            <div
              key={zone.id}
              className="frame-slot absolute"
              style={{
                left:            `${(zone.bbox.x / iW) * 100}%`,
                top:             `${(zone.bbox.y / iH) * 100}%`,
                width:           `${(zone.bbox.w / iW) * 100}%`,
                height:          `${(zone.bbox.h / iH) * 100}%`,
                backgroundColor: "#f5f0e8",
                zIndex:          1,
              }}
            >
              {lum && (
                <img
                  key={lum._id}
                  src={lum.imageUrl}
                  alt={lum.nom}
                  style={{
                    mixBlendMode: "multiply",
                    objectFit:    "contain",
                    width:        "100%",
                    height:       "100%",
                    padding:      "10%",
                    display:      "block",
                  }}
                />
              )}
            </div>
          )
        })}

        {/* ── Tableau (RGBA, alpha natif) positionné AU-DESSUS des cadres ── */}
        {/* Les zones transparentes révèlent les cadres beiges avec luminaires */}
        <img
          src={paintingUrl}
          alt="Tableau L'Enseigne de Gersaint"
          className="absolute inset-0 w-full h-full block"
          style={{ objectFit: "fill", zIndex: 2 }}
        />

        {/* ── États de chargement ── */}
        {(phase === "loading" || phase === "detecting") && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(245,241,232,0.75)" }}>
            <p className="font-serif text-sm italic text-stone-600">
              {phase === "loading"   ? "Chargement du tableau…" : "Détection des cadres…"}
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-100">
            <p className="font-serif text-sm italic text-red-400">Erreur de chargement du tableau</p>
          </div>
        )}

      </div>

      {/* ── Zones interactives (hors overflow-hidden pour que les tooltips ne soient pas clippés) ── */}
      {phase === "ready" && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
          {zones.map((zone, i) => {
            const lum   = current[i]
            const below = zone.bbox.y / iH < 0.4
            return (
              <div
                key={zone.id}
                className="absolute cursor-pointer"
                style={{
                  left:          `${(zone.bbox.x / iW) * 100}%`,
                  top:           `${(zone.bbox.y / iH) * 100}%`,
                  width:         `${(zone.bbox.w / iW) * 100}%`,
                  height:        `${(zone.bbox.h / iH) * 100}%`,
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
        style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", zIndex:10, width:38, height:38, borderRadius:"50%", background:"rgba(0,0,0,.28)", border:"none", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(4px)", opacity:hovering?(hasPrev?1:0.2):0, transition:"opacity .3s ease" }}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        onClick={() => { resetTimer(); doRotate("next") }}
        aria-label="Sélection suivante"
        style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", zIndex:10, width:38, height:38, borderRadius:"50%", background:"rgba(0,0,0,.28)", border:"none", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(4px)", opacity:hovering?1:0, transition:"opacity .3s ease" }}
      >
        <ChevronRight size={20} />
      </button>

    </section>
  )
}
