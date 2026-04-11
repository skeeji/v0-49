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

// ─── Post-traitement des zones ───────────────────────────────────────────────────

const MERGE_GAP = CELL * 2.5

function postProcessZones(zones: FrameZone[], W: number, H: number): FrameZone[] {
  let list = zones.map(z => ({ ...z, bbox: { ...z.bbox } }))

  // A. Supprimer les micro-zones parasites
  list = list.filter(z => z.bbox.w * z.bbox.h >= CELL * CELL * 6)

  // B. Fusionner les zones proches (notamment 29+30)
  let changed = true
  while (changed) {
    changed = false
    outer: for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i].bbox, b = list[j].bbox
        const xGap = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x+a.w, b.x+b.w))
        const yGap = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y+a.h, b.y+b.h))
        if (xGap <= MERGE_GAP && yGap <= MERGE_GAP) {
          const x0 = Math.min(a.x, b.x),         y0 = Math.min(a.y, b.y)
          const x1 = Math.max(a.x+a.w, b.x+b.w), y1 = Math.max(a.y+a.h, b.y+b.h)
          list[i] = { id: list[i].id, bbox: { x:x0, y:y0, w:x1-x0, h:y1-y0 } }
          list.splice(j, 1); changed = true; break outer
        }
      }
    }
  }

  // C. Découper les zones trop larges (2 cadres collés détectés comme 1)
  const result: FrameZone[] = []
  for (const z of list) {
    if (z.bbox.w > z.bbox.h * 1.9 && z.bbox.w > 80) {
      const hw = Math.floor(z.bbox.w / 2)
      result.push({ id:0, bbox:{ x:z.bbox.x,      y:z.bbox.y, w:hw,            h:z.bbox.h } })
      result.push({ id:0, bbox:{ x:z.bbox.x + hw, y:z.bbox.y, w:z.bbox.w - hw, h:z.bbox.h } })
    } else {
      result.push(z)
    }
  }

  return result
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
    .map((z, i) => ({ ...z, id: i }))
}

// ─── Utilitaires ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function pickRandom(pool: GalleryLuminaire[], n: number): GalleryLuminaire[] {
  if (pool.length === 0) return []
  const repeated: GalleryLuminaire[] = []
  while (repeated.length < n) repeated.push(...pool)
  for (let i = repeated.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [repeated[i], repeated[j]] = [repeated[j], repeated[i]]
  }
  return repeated.slice(0, n)
}

function detectBackgroundColor(data: Uint8ClampedArray, W: number, H: number): [number, number, number] {
  const samples = [
    [0.05, 0.3], [0.05, 0.5], [0.05, 0.7],
    [0.95, 0.3], [0.95, 0.5], [0.95, 0.7],
    [0.3,  0.05],[0.5,  0.05],[0.7,  0.05],
  ]
  const rs: number[] = [], gs: number[] = [], bs: number[] = []
  for (const [fx, fy] of samples) {
    const idx = (Math.round(fy * H) * W + Math.round(fx * W)) * 4
    if (data[idx + 3] > 200) {
      rs.push(data[idx]); gs.push(data[idx+1]); bs.push(data[idx+2])
    }
  }
  const med = (arr: number[]) => { arr.sort((a,b)=>a-b); return arr[Math.floor(arr.length/2)] }
  const result: [number, number, number] = [med(rs), med(gs), med(bs)]
  console.log(`[Gallery] fond détecté rgb(${result[0]},${result[1]},${result[2]})`)
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

// ─── Compositing d'un luminaire dans une zone (niveau pixel) ────────────────────

async function compositeZone(
  base:     Uint8ClampedArray,
  origData: Uint8ClampedArray,
  bbox:     { x: number; y: number; w: number; h: number },
  lumUrl:   string,
  W:        number,
  bgColor:  [number, number, number],
): Promise<void> {
  let img: HTMLImageElement
  try {
    img = await Promise.race([
      loadImg(lumUrl),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
    ]) as HTMLImageElement
  } catch { return }

  const { x: bx, y: by, w: ocW, h: ocH } = bbox

  const oc   = document.createElement("canvas")
  oc.width   = ocW; oc.height = ocH
  const octx = oc.getContext("2d")!
  octx.fillStyle = `rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]})`
  octx.fillRect(0, 0, ocW, ocH)

  const PAD    = 0.05
  const availW = ocW * (1 - 2 * PAD)
  const availH = ocH * (1 - 2 * PAD)
  const scale  = Math.min(availW / img.naturalWidth, availH / img.naturalHeight)
  const dw     = img.naturalWidth  * scale
  const dh     = img.naturalHeight * scale
  const dx     = (ocW - dw) / 2
  const dy     = (ocH - dh) / 2
  octx.drawImage(img, dx, dy, dw, dh)

  const [CR, CG, CB] = bgColor
  const ocData = octx.getImageData(0, 0, ocW, ocH)
  const d = ocData.data

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3]
    if (a < 10) continue

    const mx  = Math.max(r, g, b)
    const mn  = Math.min(r, g, b)
    const sat = mx === 0 ? 0 : (mx - mn) / mx
    const lum = mx / 255

    if (lum > 0.78 && sat < 0.13) {
      const tLum = Math.min(1, (lum - 0.78) / 0.22)
      const tSat = Math.min(1, 1 - sat / 0.13)
      const t    = tLum * tSat
      d[i]   = Math.round(r * (1-t) + CR * t)
      d[i+1] = Math.round(g * (1-t) + CG * t)
      d[i+2] = Math.round(b * (1-t) + CB * t)
      // Ne jamais toucher alpha — pas de détourage
    }
  }
  octx.putImageData(ocData, 0, 0)

  for (let row = 0; row < ocH; row++) {
    for (let col = 0; col < ocW; col++) {
      const px = bx + col, py = by + row
      if (px < 0 || px >= W || py < 0) continue
      const origIdx = (py * W + px) * 4
      if (origData[origIdx + 3] < ALPHA_THRESHOLD) {
        const lumIdx      = (row * ocW + col) * 4
        base[origIdx]     = d[lumIdx]
        base[origIdx + 1] = d[lumIdx + 1]
        base[origIdx + 2] = d[lumIdx + 2]
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
  const bgColorRef    = useRef<[number, number, number]>([245, 240, 232])

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
          ? compositeZone(base, origDataRef.current!, zone.bbox, sel[i].imageUrl, W, bgColorRef.current)
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
        bgColorRef.current  = detectBackgroundColor(origDataRef.current, W, H)

        setPhase("detecting")
        await sleep(16)
        if (cancelled) return

        const raw      = detectZonesGrid(origDataRef.current, W, H)
        const detected = postProcessZones(raw, W, H)

        const [CR, CG, CB] = bgColorRef.current
        console.log(`[Gallery] ${detected.length} zones finales | fond rgb(${CR},${CG},${CB})`)
        detected.forEach(z => console.log(`  #${z.id} (${z.bbox.x},${z.bbox.y}) ${z.bbox.w}×${z.bbox.h}`))

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
