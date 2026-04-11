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
  id:   number
  bbox: { x: number; y: number; w: number; h: number }
}

// ─── Constantes ─────────────────────────────────────────────────────────────────

const ROTATION_INTERVAL  = 30_000
const ALPHA_THRESHOLD    = 128
const BG_R = 245, BG_G = 240, BG_B = 232   // #f5f0e8

// ─── Détection des zones par grille ─────────────────────────────────────────────

const CELL         = 22
const FRAME_RATIO  = 0.55
const BORDER_CELLS = 2
const MIN_ZONE_PX  = 1200
const MAX_ZONE_PCT = 0.18

function detectZonesGrid(data: Uint8ClampedArray, W: number, H: number): FrameZone[] {
  const gW = Math.ceil(W / CELL)
  const gH = Math.ceil(H / CELL)
  const isFrame = new Uint8Array(gW * gH)

  for (let cy = BORDER_CELLS; cy < gH - BORDER_CELLS; cy++) {
    for (let cx = BORDER_CELLS; cx < gW - BORDER_CELLS; cx++) {
      let transp = 0, total = 0
      const px0 = cx * CELL, py0 = cy * CELL
      const px1 = Math.min(px0 + CELL, W), py1 = Math.min(py0 + CELL, H)
      for (let py = py0; py < py1; py++)
        for (let px = px0; px < px1; px++) {
          total++
          if (data[(py * W + px) * 4 + 3] < ALPHA_THRESHOLD) transp++
        }
      if (total > 0 && transp / total >= FRAME_RATIO) isFrame[cy * gW + cx] = 1
    }
  }

  const visited = new Uint8Array(gW * gH)
  const zones: FrameZone[] = []
  const totalPx = W * H

  for (let cy = BORDER_CELLS; cy < gH - BORDER_CELLS; cy++) {
    for (let cx = BORDER_CELLS; cx < gW - BORDER_CELLS; cx++) {
      const ci = cy * gW + cx
      if (visited[ci] || !isFrame[ci]) continue
      const q = [ci]; visited[ci] = 1
      let qi = 0, cx0 = cx, cx1 = cx, cy0 = cy, cy1 = cy

      while (qi < q.length) {
        const c = q[qi++]
        const ccx = c % gW, ccy = (c / gW) | 0
        if (ccx < cx0) cx0 = ccx; if (ccx > cx1) cx1 = ccx
        if (ccy < cy0) cy0 = ccy; if (ccy > cy1) cy1 = ccy
        for (const n of [c-1, c+1, c-gW, c+gW]) {
          if (n < 0 || n >= gW * gH) continue
          const nx = n % gW, ny = (n / gW) | 0
          if (nx < BORDER_CELLS || nx >= gW - BORDER_CELLS) continue
          if (ny < BORDER_CELLS || ny >= gH - BORDER_CELLS) continue
          if (!visited[n] && isFrame[n]) { visited[n] = 1; q.push(n) }
        }
      }

      const bx = cx0 * CELL, by = cy0 * CELL
      const bw = Math.min((cx1 + 1) * CELL, W) - bx
      const bh = Math.min((cy1 + 1) * CELL, H) - by
      const area = bw * bh
      if (area < MIN_ZONE_PX || area > totalPx * MAX_ZONE_PCT) continue
      zones.push({ id: zones.length, bbox: { x: bx, y: by, w: bw, h: bh } })
    }
  }

  return zones
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
    .map((z, i) => ({ ...z, id: i }))
}

// ─── Utilitaires ────────────────────────────────────────────────────────────────

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

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error(`Cannot load: ${src}`))
    img.src = src
  })
}

// ─── Compositing d'un luminaire dans une zone (niveau pixel, v18-good adapté) ───

async function compositeZone(
  base:     Uint8ClampedArray,
  origData: Uint8ClampedArray,
  bbox:     { x: number; y: number; w: number; h: number },
  lumUrl:   string,
  W:        number,
): Promise<void> {
  let img: HTMLImageElement
  try {
    img = await Promise.race([
      loadImg(lumUrl),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
    ]) as HTMLImageElement
  } catch { return }

  const { x: bx, y: by, w: bw, h: bh } = bbox

  const oc   = document.createElement("canvas")
  oc.width   = bw; oc.height = bh
  const octx = oc.getContext("2d")!
  octx.fillStyle = `rgb(${BG_R},${BG_G},${BG_B})`
  octx.fillRect(0, 0, bw, bh)

  const pad    = 0.10
  const availW = bw * (1 - 2 * pad)
  const availH = bh * (1 - 2 * pad)
  const scale  = Math.min(availW / img.naturalWidth, availH / img.naturalHeight)
  const dw     = img.naturalWidth  * scale
  const dh     = img.naturalHeight * scale
  const dx     = (bw - dw) / 2
  const dy     = (bh - dh) / 2
  octx.drawImage(img, dx, dy, dw, dh)

  const lumImgData = octx.getImageData(0, 0, bw, bh)
  const lumD       = lumImgData.data

  for (let i = 0; i < lumD.length; i += 4) {
    const r = lumD[i], g = lumD[i + 1], b = lumD[i + 2]
    if (r > 220 && g > 220 && b > 220) {
      lumD[i] = BG_R; lumD[i + 1] = BG_G; lumD[i + 2] = BG_B
    } else {
      const minCh = Math.min(r, g, b)
      if (minCh > 180) {
        const t = (minCh - 180) / 40
        lumD[i]     = Math.round(r + (BG_R - r) * t)
        lumD[i + 1] = Math.round(g + (BG_G - g) * t)
        lumD[i + 2] = Math.round(b + (BG_B - b) * t)
      }
    }
  }

  for (let row = 0; row < bh; row++) {
    for (let col = 0; col < bw; col++) {
      const px = bx + col, py = by + row
      if (px < 0 || px >= W || py < 0) continue
      const origIdx = (py * W + px) * 4
      if (origData[origIdx + 3] < ALPHA_THRESHOLD) {
        const lumIdx      = (row * bw + col) * 4
        base[origIdx]     = lumD[lumIdx]
        base[origIdx + 1] = lumD[lumIdx + 1]
        base[origIdx + 2] = lumD[lumIdx + 2]
        base[origIdx + 3] = 255
      }
    }
  }
}

// ─── Museum label ────────────────────────────────────────────────────────────────
// Fix tooltip : pointer-events auto + onEnter/onLeave partagés avec la zone
// → le label reste visible quand la souris glisse du cadre vers l'étiquette.

interface LabelProps {
  lum:     GalleryLuminaire
  visible: boolean
  below:   boolean
  onEnter: () => void
  onLeave: () => void
}

function MuseumLabel({ lum, visible, below, onEnter, onLeave }: LabelProps) {
  const pos  = below ? { top:"calc(100% + 6px)", bottom:"auto" } : { bottom:"calc(100% + 6px)", top:"auto" }
  const aOut = below
    ? { top:-7,  bottom:"auto", borderBottom:"7px solid #b8974a", borderTop:"none" }
    : { bottom:-7, top:"auto", borderTop:"7px solid #b8974a",   borderBottom:"none" }
  const aIn  = below
    ? { top:-5,  bottom:"auto", borderBottom:"6px solid #f0e6c0", borderTop:"none" }
    : { bottom:-5, top:"auto", borderTop:"6px solid #f0e6c0",   borderBottom:"none" }
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        ...pos,
        position:      "absolute",
        left:          "50%",
        transform:     "translateX(-50%)",
        minWidth:      150,
        maxWidth:      200,
        opacity:       visible ? 1 : 0,
        transition:    "opacity 0.2s ease",
        zIndex:        50,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div style={{ background:"linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)", border:"1px solid #b8974a", borderRadius:2, padding:"8px 10px", boxShadow:"0 2px 10px rgba(0,0,0,.35)", position:"relative" }}>
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", ...aOut }} />
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", ...aIn }} />
        <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:11, fontWeight:600, color:"#3d2b0a", lineHeight:1.3, margin:0 }}>{lum.nom}</p>
        {lum.designer && <p style={{ fontFamily:"Georgia,serif", fontSize:10, fontStyle:"italic", color:"#6b4f1a", marginTop:2, marginBottom:0 }}>{lum.designer}</p>}
        {lum.annee    && <p style={{ fontFamily:"Georgia,serif", fontSize:9,  color:"#7a5c20",  marginTop:1,  marginBottom:0 }}>{lum.annee}</p>}
        <Link
          href={`/luminaires/${lum._id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily:"Georgia,serif", fontSize:9, color:"#5a3a10", textDecoration:"underline", display:"block", marginTop:4 }}
          onClick={e => e.stopPropagation()}
        >
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────────

export function PaintingGallery({ transparentUrl }: { transparentUrl?: string }) {

  const canvasARef    = useRef<HTMLCanvasElement>(null)
  const canvasBRef    = useRef<HTMLCanvasElement>(null)
  const activeRef     = useRef<"A"|"B">("A")
  const origDataRef   = useRef<Uint8ClampedArray | null>(null)
  const paintingRef   = useRef<HTMLImageElement | null>(null)
  const imgSizeRef    = useRef({ w: 1330, h: 876 })
  const zonesRef      = useRef<FrameZone[]>([])
  const historyRef    = useRef<GalleryLuminaire[][]>([])
  const currentRef    = useRef<GalleryLuminaire[]>([])
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout>  | null>(null)

  const [pool,          setPool]          = useState<GalleryLuminaire[]>([])
  const [current,       setCurrent]       = useState<GalleryLuminaire[]>([])
  const [zones,         setZones]         = useState<FrameZone[]>([])
  const [paintingReady, setPaintingReady] = useState(false)
  const [imgSize,       setImgSize]       = useState({ w: 1330, h: 876 })
  const [phase,         setPhase]         = useState<"loading"|"detecting"|"compositing"|"ready"|"error">("loading")
  const [alphaA,        setAlphaA]        = useState(0)
  const [alphaB,        setAlphaB]        = useState(0)
  const [hovZone,       setHovZone]       = useState<number | null>(null)
  const [hovering,      setHovering]      = useState(false)
  const [hasPrev,       setHasPrev]       = useState(false)
  const [debugZones,    setDebugZones]    = useState(false)

  // ── Tooltip : timer partagé zone ↔ label ─────────────────────────────────────
  const handleEnter = useCallback((id: number) => {
    if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null }
    setHovZone(id)
  }, [])

  const handleLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => setHovZone(null), 250)
  }, [])

  // ── Pool ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

  // ── doComposite ───────────────────────────────────────────────────────────────
  const doComposite = useCallback(async (
    sel:    GalleryLuminaire[],
    zones:  FrameZone[],
    W:      number,
    H:      number,
    target: HTMLCanvasElement,
  ) => {
    if (!origDataRef.current || !paintingRef.current) return

    const tmp    = document.createElement("canvas")
    tmp.width    = W; tmp.height = H
    const tmpCtx = tmp.getContext("2d")!
    tmpCtx.fillStyle = `rgb(${BG_R},${BG_G},${BG_B})`
    tmpCtx.fillRect(0, 0, W, H)
    tmpCtx.drawImage(paintingRef.current, 0, 0, W, H)

    const imgData = tmpCtx.getImageData(0, 0, W, H)
    const base    = imgData.data

    await Promise.all(
      zones.map((zone, i) =>
        sel[i]
          ? compositeZone(base, origDataRef.current!, zone.bbox, sel[i].imageUrl, W)
          : Promise.resolve()
      )
    )

    target.width  = W
    target.height = H
    target.getContext("2d")!.putImageData(imgData, 0, 0)
  }, [])

  // ── Crossfade A↔B ────────────────────────────────────────────────────────────
  const crossfadeTo = useCallback(async (
    sel: GalleryLuminaire[], zns: FrameZone[], W: number, H: number,
  ) => {
    const inactive     = activeRef.current === "A" ? "B" : "A"
    const targetCanvas = inactive === "A" ? canvasARef.current : canvasBRef.current
    if (!targetCanvas) return
    await doComposite(sel, zns, W, H, targetCanvas)
    if (inactive === "A") { setAlphaA(1); setAlphaB(0) }
    else                  { setAlphaA(0); setAlphaB(1) }
    await sleep(600)
    activeRef.current = inactive
  }, [doComposite])

  // ── Chargement + détection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!transparentUrl) return
    let cancelled = false
    setPhase("loading")
    setPaintingReady(false)
    origDataRef.current = null
    currentRef.current  = []
    setAlphaA(0); setAlphaB(0)

    ;(async () => {
      try {
        const img = await loadImg(transparentUrl)
        if (cancelled) return
        const W = img.naturalWidth  || 1330
        const H = img.naturalHeight || 876
        paintingRef.current = img
        imgSizeRef.current  = { w: W, h: H }
        setImgSize({ w: W, h: H })

        const tmp = document.createElement("canvas")
        tmp.width = W; tmp.height = H
        tmp.getContext("2d")!.drawImage(img, 0, 0)
        origDataRef.current = new Uint8ClampedArray(tmp.getContext("2d")!.getImageData(0, 0, W, H).data)

        setPhase("detecting")
        await sleep(16)
        if (cancelled) return

        const detected = detectZonesGrid(origDataRef.current, W, H)
        console.log(`[PaintingGallery] ${detected.length} zones détectées (grille ${CELL}px)`,
          detected.map(z => `#${z.id} @(${z.bbox.x},${z.bbox.y}) ${z.bbox.w}×${z.bbox.h}`))

        if (cancelled) return
        zonesRef.current = detected
        setZones(detected)
        setPaintingReady(true)
      } catch {
        if (!cancelled) setPhase("error")
      }
    })()

    return () => { cancelled = true }
  }, [transparentUrl])

  // ── Première composition ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!paintingReady || pool.length === 0 || currentRef.current.length > 0) return
    ;(async () => {
      const zns = zonesRef.current
      const { w: W, h: H } = imgSizeRef.current
      const sel = pickRandom(pool, zns.length)
      currentRef.current = sel; historyRef.current = [sel]
      setCurrent(sel); setHasPrev(false)
      setPhase("compositing")
      await doComposite(sel, zns, W, H, canvasARef.current!)
      activeRef.current = "A"; setAlphaA(1); setAlphaB(0)
      setPhase("ready")
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, paintingReady, doComposite])

  // ── Rotation ─────────────────────────────────────────────────────────────────
  const doRotate = useCallback(async (dir: "next"|"prev") => {
    if (pool.length === 0 || !origDataRef.current) return
    const zns = zonesRef.current
    if (zns.length === 0) return
    const { w: W, h: H } = imgSizeRef.current
    let sel: GalleryLuminaire[]
    if (dir === "next") {
      sel = pickRandom(pool, zns.length)
      historyRef.current = [...historyRef.current.slice(-10), sel]
    } else {
      const h = historyRef.current
      sel = h.length > 1 ? h[h.length-2] : currentRef.current
      historyRef.current = h.length > 1 ? h.slice(0,-1) : h
    }
    setHasPrev(historyRef.current.length > 1)
    currentRef.current = sel; setCurrent(sel)
    await crossfadeTo(sel, zns, W, H)
  }, [pool, crossfadeTo])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => doRotate("next"), ROTATION_INTERVAL)
  }, [doRotate])

  useEffect(() => {
    if (phase !== "ready" || pool.length === 0) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, pool.length, resetTimer])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "d" || e.key === "D") setDebugZones(v => !v) }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────

  if (!transparentUrl) {
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
      <div className="relative w-full overflow-hidden"
        style={{ aspectRatio:`${iW} / ${iH}`, background:`rgb(${BG_R},${BG_G},${BG_B})` }}>

        <canvas ref={canvasARef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:1, opacity:alphaA, transition:"opacity 0.6s ease" }} />
        <canvas ref={canvasBRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:1, opacity:alphaB, transition:"opacity 0.6s ease" }} />

        {debugZones && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex:30 }}>
            {zones.map(zone => (
              <div key={zone.id} style={{
                position:"absolute",
                left:`${(zone.bbox.x/iW)*100}%`, top:`${(zone.bbox.y/iH)*100}%`,
                width:`${(zone.bbox.w/iW)*100}%`, height:`${(zone.bbox.h/iH)*100}%`,
                border:"2px solid rgba(255,80,80,0.9)", background:"rgba(255,0,0,0.15)",
                boxSizing:"border-box", display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <span style={{ color:"#fff", fontSize:9, fontWeight:700, textShadow:"0 0 3px #000" }}>{zone.id}</span>
              </div>
            ))}
            <div style={{ position:"absolute", top:6, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,.75)", color:"#fff", fontSize:11, padding:"3px 10px", borderRadius:4, whiteSpace:"nowrap" }}>
              DEBUG — {zones.length} zones — D pour fermer
            </div>
          </div>
        )}

        {(phase === "loading" || phase === "detecting" || phase === "compositing") && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background:"rgba(245,241,232,0.75)" }}>
            <p className="font-serif text-sm italic text-stone-600">
              {phase === "loading"    ? "Chargement du tableau…"  :
               phase === "detecting" ? "Détection des cadres…"   :
                                       "Placement des luminaires…"}
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-100">
            <p className="font-serif text-sm italic text-red-400">Erreur de chargement du tableau</p>
          </div>
        )}
      </div>

      {phase === "ready" && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex:5 }}>
          {zones.map((zone, i) => {
            const lum   = current[i]
            const below = zone.bbox.y / iH < 0.4
            return (
              <div key={zone.id} className="absolute"
                style={{
                  left:`${(zone.bbox.x/iW)*100}%`, top:`${(zone.bbox.y/iH)*100}%`,
                  width:`${(zone.bbox.w/iW)*100}%`, height:`${(zone.bbox.h/iH)*100}%`,
                  pointerEvents:"auto", cursor:"default",
                }}
                onMouseEnter={() => handleEnter(zone.id)}
                onMouseLeave={handleLeave}
              >
                {lum && (
                  <MuseumLabel
                    lum={lum}
                    visible={hovZone === zone.id}
                    below={below}
                    onEnter={() => handleEnter(zone.id)}
                    onLeave={handleLeave}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      <button onClick={() => { resetTimer(); doRotate("prev") }} disabled={!hasPrev}
        aria-label="Sélection précédente"
        style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", zIndex:10, width:38, height:38, borderRadius:"50%", background:"rgba(0,0,0,.28)", border:"none", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(4px)", opacity:hovering?(hasPrev?1:0.2):0, transition:"opacity .3s ease" }}
      ><ChevronLeft size={20} /></button>

      <button onClick={() => { resetTimer(); doRotate("next") }}
        aria-label="Sélection suivante"
        style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", zIndex:10, width:38, height:38, borderRadius:"50%", background:"rgba(0,0,0,.28)", border:"none", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(4px)", opacity:hovering?1:0, transition:"opacity .3s ease" }}
      ><ChevronRight size={20} /></button>

    </section>
  )
}
