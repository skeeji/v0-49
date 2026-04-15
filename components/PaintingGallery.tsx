"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────────

interface GalleryLuminaire {
  _id:          string
  nom:          string
  designer:     string
  annee:        string | number
  imageUrl:     string
  luminaire_id?: string   // _id du luminaire catalogue (pour le lien "Voir le produit")
}

interface FrameZone {
  id:        number
  bbox:      { x: number; y: number; w: number; h: number }
  rotation?: number
}

// ─── Constantes ──────────────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 30_000
const ALPHA_THRESHOLD   = 128
// Fond gris-beige patiné — imite papier ancien / pierre de taille en gravure
const BG_R = 186, BG_G = 184, BG_B = 177   // #BAB8B1

// Détection par grille (rapide) ─────────────────────────────────────────────────
const CELL         = 22
const FRAME_RATIO  = 0.55
const BORDER_CELLS = 2
const MIN_ZONE_PX  = 1200
const MAX_ZONE_PCT = 0.18

function detectZones(data: Uint8ClampedArray, W: number, H: number): FrameZone[] {
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

// ─── Patches : fusion #29+#30 et rotation 15° ────────────────────────────────────

function applyZonePatches(zones: FrameZone[]): FrameZone[] {
  let result = [...zones]
  const z29 = result.find(z => z.id === 29)
  const z30 = result.find(z => z.id === 30)
  if (z29 && z30) {
    const x  = Math.min(z29.bbox.x, z30.bbox.x)
    const y  = Math.min(z29.bbox.y, z30.bbox.y)
    const x2 = Math.max(z29.bbox.x + z29.bbox.w, z30.bbox.x + z30.bbox.w)
    const y2 = Math.max(z29.bbox.y + z29.bbox.h, z30.bbox.y + z30.bbox.h)
    z29.bbox = { x, y, w: x2 - x, h: y2 - y }
    result = result.filter(z => z.id !== 30)
  }
  result = result.map(z => z.id === 29 ? { ...z, rotation: 15 } : z)
  return result
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────────

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

// ─── Composite un luminaire dans une zone ────────────────────────────────────────
// Écrit uniquement sur les pixels transparents du PNG original.
// Respecte l'alpha du luminaire → fonctionne avec fond blanc (catalogue) ET détouré.

async function compositeZone(
  output:   Uint8ClampedArray,
  origData: Uint8ClampedArray,
  bbox:     { x: number; y: number; w: number; h: number },
  lumUrl:   string,
  W:        number,
): Promise<void> {
  const { x: bx, y: by, w: bw, h: bh } = bbox

  let img: HTMLImageElement
  try {
    img = await Promise.race([
      loadImg(lumUrl),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
    ]) as HTMLImageElement
  } catch { return }

  const oc   = document.createElement("canvas")
  oc.width   = bw; oc.height = bh
  const octx = oc.getContext("2d")!
  octx.imageSmoothingEnabled = true
  octx.imageSmoothingQuality = "high"

  // ── 1. Fond : radial-gradient(circle at 50% 30%, #D6D3CC 0%, #B2AFA6 60%, #96938A 100%)
  const cx   = bw * 0.50
  const cy   = bh * 0.30
  const rMax = Math.sqrt(bw * bw + bh * bh) * 0.82
  const grad = octx.createRadialGradient(cx, cy, 0, cx, cy, rMax)
  grad.addColorStop(0,   '#D6D3CC')   // halo centre
  grad.addColorStop(0.6, '#B2AFA6')   // 60% : ton intermédiaire
  grad.addColorStop(1,   '#96938A')   // angles sombres
  octx.fillStyle = grad
  octx.fillRect(0, 0, bw, bh)

  // ── 2. drop-shadow(10px 15px 10px rgba(0,0,0,0.4)) sur le luminaire ─────────
  const nW    = img.naturalWidth  || bw
  const nH    = img.naturalHeight || bh
  const scale = Math.min((bw * 0.88) / nW, (bh * 0.88) / nH)
  const dw    = nW * scale, dh = nH * scale
  const dx    = (bw - dw) / 2,  dy = (bh - dh) / 2

  octx.shadowColor   = 'rgba(0,0,0,0.40)'
  octx.shadowBlur    = 20             // blur ≈ 10px CSS (canvas double)
  octx.shadowOffsetX = 10
  octx.shadowOffsetY = 15
  octx.drawImage(img, dx, dy, dw, dh)
  octx.shadowColor = 'transparent'
  octx.shadowBlur = 0; octx.shadowOffsetX = 0; octx.shadowOffsetY = 0

  // ── 3. box-shadow: inset 10px 10px 40px rgba(0,0,0,0.3) ─────────────────────
  //       inset -5px -5px 20px rgba(255,255,255,0.1)
  //  → 4 dégradés sombres (bords) + highlight blanc bas-droite (alcôve)

  // Bords sombres haut-gauche (inset 10px 10px 40px rgba(0,0,0,0.3))
  const vgX = bw * 0.30, vgY = bh * 0.28
  const darkSides: [number,number,number,number,[number,number,number,number],number][] = [
    [0,      0,      bw,  vgY,  [0, 0,      0, vgY ], 0.32],  // haut
    [0,      bh-vgY, bw,  vgY,  [0, bh-vgY, 0, bh  ], 0.28],  // bas
    [0,      0,      vgX, bh,   [0, 0,      vgX, 0  ], 0.26],  // gauche
    [bw-vgX, 0,      vgX, bh,   [bw-vgX, 0, bw, 0   ], 0.26],  // droite
  ]
  darkSides.forEach(([rx, ry, rw, rh, [x0,y0,x1,y1], op]) => {
    const fromEdge = ry === 0 && rh < bh / 2 || ry > 0  // top or bottom?
    const lg = octx.createLinearGradient(x0, y0, x1, y1)
    const isTop = ry === 0 && rh < bh
    const isLeft = rx === 0 && rw < bw
    const edgeFirst = isTop || isLeft
    lg.addColorStop(edgeFirst ? 0 : 1, `rgba(0,0,0,${op})`)
    lg.addColorStop(edgeFirst ? 1 : 0, 'rgba(0,0,0,0)')
    octx.fillStyle = lg
    octx.fillRect(rx, ry, rw, rh)
  })

  // Highlight blanc bas-droite (inset -5px -5px 20px rgba(255,255,255,0.1))
  const hlGrad = octx.createRadialGradient(bw, bh, 0, bw * 0.65, bh * 0.65, Math.max(bw, bh) * 0.55)
  hlGrad.addColorStop(0,   'rgba(255,255,255,0.11)')
  hlGrad.addColorStop(1,   'rgba(255,255,255,0)')
  octx.fillStyle = hlGrad
  octx.fillRect(0, 0, bw, bh)

  // ── 4. Grain : ::before opacity:0.04 mix-blend-mode:multiply → ±4 par canal ─
  const lumImgData = octx.getImageData(0, 0, bw, bh)
  const d          = lumImgData.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const n = (Math.random() - 0.5) * 8        // ±4 intensité (≈ opacity 0.04)
    d[i]   = Math.max(0, Math.min(255, d[i]   + n))
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + n))
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + n))
  }

  // ── 5. Tint blanc→BG pour images catalogue (fond blanc) ─────────────────────
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2]
    const w = Math.min(r, g, b) / 255
    if (w > 0.88) {
      d[i] = BG_R; d[i+1] = BG_G; d[i+2] = BG_B
    } else if (w > 0.72) {
      const t = (w - 0.72) / 0.16
      d[i]   = Math.round(r + (BG_R - r) * t)
      d[i+1] = Math.round(g + (BG_G - g) * t)
      d[i+2] = Math.round(b + (BG_B - b) * t)
    }
  }

  // ── 6. Écriture uniquement sur les pixels transparents du PNG original ───────
  for (let row = 0; row < bh; row++) {
    for (let col = 0; col < bw; col++) {
      const px = bx + col, py = by + row
      if (px < 0 || px >= W || py < 0) continue
      const bi = (py * W + px) * 4
      const li = (row * bw + col) * 4
      if (origData[bi + 3] < ALPHA_THRESHOLD) {
        const lumAlpha = d[li + 3]
        if (lumAlpha === 0) continue
        output[bi]     = d[li]
        output[bi + 1] = d[li + 1]
        output[bi + 2] = d[li + 2]
        output[bi + 3] = lumAlpha
      }
    }
  }
}

// ─── DPR-aware putImageData ───────────────────────────────────────────────────────

function putDPR(canvas: HTMLCanvasElement, data: Uint8ClampedArray, W: number, H: number, clear: boolean): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width  = W * dpr
  canvas.height = H * dpr
  const tmp = document.createElement("canvas")
  tmp.width = W; tmp.height = H
  tmp.getContext("2d")!.putImageData(new ImageData(data, W, H), 0, 0)
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  if (clear) ctx.clearRect(0, 0, W * dpr, H * dpr)
  ctx.drawImage(tmp, 0, 0, W * dpr, H * dpr)
}

// ─── Museum label ─────────────────────────────────────────────────────────────────

function MuseumLabel({
  lum, visible, below, onEnter, onLeave,
}: {
  lum: GalleryLuminaire; visible: boolean; below: boolean
  onEnter: () => void; onLeave: () => void
}) {
  const pos  = below ? { top: "calc(100% + 6px)" } : { bottom: "calc(100% + 6px)" }
  const arrO = below ? { top:-7, borderBottom:"7px solid #b8974a", borderTop:"none" } : { bottom:-7, borderTop:"7px solid #b8974a", borderBottom:"none" }
  const arrI = below ? { top:-5, borderBottom:"6px solid #f0e6c0", borderTop:"none" } : { bottom:-5, borderTop:"6px solid #f0e6c0", borderBottom:"none" }
  const href = lum.luminaire_id ? `/luminaires/${lum.luminaire_id}` : null
  return (
    // pointer-events-auto : le tooltip est interactif → la souris peut rester dessus
    <div className="absolute z-50"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ ...pos, left:"50%", transform:"translateX(-50%)", minWidth:150, maxWidth:200, opacity:visible?1:0, transition:"opacity 0.2s ease", pointerEvents: visible ? "auto" : "none" }}>
      <div style={{ background:"linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)", border:"1px solid #b8974a", borderRadius:2, padding:"8px 10px", boxShadow:"0 2px 10px rgba(0,0,0,.35)", position:"relative" }}>
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", ...arrO }} />
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", ...arrI }} />
        <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:11, fontWeight:600, color:"#3d2b0a", lineHeight:1.3, margin:0 }}>{lum.nom}</p>
        {lum.designer && <p style={{ fontFamily:"Georgia,serif", fontSize:10, fontStyle:"italic", color:"#6b4f1a", marginTop:2, marginBottom:0 }}>{lum.designer}</p>}
        {lum.annee    && <p style={{ fontFamily:"Georgia,serif", fontSize:9,  color:"#7a5c20", marginTop:1, marginBottom:0 }}>{lum.annee}</p>}
        {href ? (
          <Link href={href} target="_blank" rel="noopener noreferrer"
            className="block mt-1"
            style={{ fontFamily:"Georgia,serif", fontSize:9, color:"#5a3a10", textDecoration:"underline" }}
            onClick={e => e.stopPropagation()}>
            Voir le produit →
          </Link>
        ) : (
          <p style={{ fontFamily:"Georgia,serif", fontSize:9, color:"#9a8060", marginTop:4, marginBottom:0, fontStyle:"italic" }}>
            Lien non disponible
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────────

export function PaintingGallery({ transparentUrl }: { transparentUrl?: string }) {

  const canvasBaseRef = useRef<HTMLCanvasElement>(null)  // fond permanent
  const canvasCompRef = useRef<HTMLCanvasElement>(null)  // luminaires, crossfade

  const origDataRef   = useRef<Uint8ClampedArray | null>(null)
  const zonesRef      = useRef<FrameZone[]>([])
  const imgSizeRef    = useRef({ w: 1330, h: 876 })
  const historyRef    = useRef<GalleryLuminaire[][]>([])
  const currentRef    = useRef<GalleryLuminaire[]>([])
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout>  | null>(null)

  const [pool,      setPool]      = useState<GalleryLuminaire[]>([])
  const [current,   setCurrent]   = useState<GalleryLuminaire[]>([])
  const [zones,     setZones]     = useState<FrameZone[]>([])
  const [phase,     setPhase]     = useState<"loading"|"detecting"|"compositing"|"ready"|"error">("loading")
  const [alphaBase, setAlphaBase] = useState(0)
  const [alphaComp, setAlphaComp] = useState(0)
  const [hovZone,   setHovZone]   = useState<number | null>(null)
  const [hovering,  setHovering]  = useState(false)
  const [hasPrev,   setHasPrev]   = useState(false)
  const [debugOn,   setDebugOn]   = useState(false)
  const [hovDebug,  setHovDebug]  = useState<number | null>(null)

  // ── Pool : galerie dédiée, fallback catalogue ─────────────────────────────────
  useEffect(() => {
    fetch("/api/galerie/luminaires")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.luminaires.length > 0) {
          setPool(d.luminaires)
        } else {
          // Fallback : catalogue principal
          return fetch("/api/luminaires-gallery")
            .then(r => r.json())
            .then(d2 => { if (d2.success) setPool(d2.luminaires) })
        }
      })
      .catch(() => {
        fetch("/api/luminaires-gallery")
          .then(r => r.json())
          .then(d => { if (d.success) setPool(d.luminaires) })
          .catch(() => {})
      })
  }, [])

  // ── Composite sur canvasComp ──────────────────────────────────────────────────
  const doComposite = useCallback(async (
    sel: GalleryLuminaire[], zns: FrameZone[], W: number, H: number,
  ) => {
    if (!canvasCompRef.current || !origDataRef.current) return
    const output = new Uint8ClampedArray(W * H * 4)
    await Promise.all(
      zns.map((zone, i) =>
        sel[i] ? compositeZone(output, origDataRef.current!, zone.bbox, sel[i].imageUrl, W) : Promise.resolve()
      )
    )
    putDPR(canvasCompRef.current, output, W, H, true)
  }, [])

  // ── Chargement tableau + détection ───────────────────────────────────────────
  useEffect(() => {
    if (!transparentUrl) return
    let cancelled = false

    ;(async () => {
      try {
        setPhase("loading")
        setAlphaBase(0); setAlphaComp(0)

        const img = await loadImg(transparentUrl)
        if (cancelled) return

        const W = img.naturalWidth  || 1330
        const H = img.naturalHeight || 876
        imgSizeRef.current = { w: W, h: H }

        const tmp = document.createElement("canvas")
        tmp.width = W; tmp.height = H
        tmp.getContext("2d")!.drawImage(img, 0, 0)
        const imgData = tmp.getContext("2d")!.getImageData(0, 0, W, H)

        // Cache sessionStorage
        const cacheKey = `pgz_${W}x${H}`
        let detected: FrameZone[] | null = null
        try {
          const cached = sessionStorage.getItem(cacheKey)
          if (cached) detected = JSON.parse(cached) as FrameZone[]
        } catch {}

        if (!detected) {
          setPhase("detecting")
          await sleep(16)
          if (cancelled) return
          detected = detectZones(imgData.data, W, H)
          console.log(`[PaintingGallery] ${detected.length} zones`, detected.map(z => `#${z.id} ${z.bbox.w}×${z.bbox.h}`))
        }

        detected = applyZonePatches(detected)
        try { sessionStorage.setItem(cacheKey, JSON.stringify(detected)) } catch {}

        zonesRef.current = detected
        setZones(detected)

        // ── BUG FIX 1 : stocker les pixels ORIGINAUX (avec transparence) pour le compositing
        origDataRef.current = new Uint8ClampedArray(imgData.data)

        // Base canvas : copie séparée où transparent → beige
        const baseData = new Uint8ClampedArray(imgData.data)
        for (let i = 0; i < baseData.length; i += 4) {
          if (baseData[i + 3] < ALPHA_THRESHOLD) {
            baseData[i] = BG_R; baseData[i+1] = BG_G; baseData[i+2] = BG_B; baseData[i+3] = 255
          }
        }
        putDPR(canvasBaseRef.current!, baseData, W, H, false)
        if (cancelled) return
        setAlphaBase(1)

        // Phase : "ready" toujours — le 2ème useEffect gère le composite dès que pool+zones sont prêts
        if (!cancelled) setPhase("ready")
      } catch (e) {
        console.error("[PaintingGallery]", e)
        if (!cancelled) setPhase("error")
      }
    })()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transparentUrl])

  // ── Premier composite quand pool + zones prêts ───────────────────────────────
  // BUG FIX 2 : ajouter "zones" dans les dépendances pour que cet effet re-tourne
  // aussi quand les zones sont détectées APRÈS que le pool a chargé.
  useEffect(() => {
    if (pool.length === 0 || zones.length === 0 || currentRef.current.length > 0) return
    const zns = zonesRef.current
    const { w: W, h: H } = imgSizeRef.current
    ;(async () => {
      const sel = pickRandom(pool, zns.length)
      currentRef.current = sel; historyRef.current = [sel]
      setCurrent(sel); setHasPrev(false)
      setPhase("compositing")
      await doComposite(sel, zns, W, H)
      setAlphaComp(1)
      setPhase("ready")
    })()
  }, [pool, zones, doComposite])

  // ── Rotation ─────────────────────────────────────────────────────────────────
  const doRotate = useCallback(async (dir: "next" | "prev") => {
    const zns = zonesRef.current
    if (zns.length === 0 || pool.length === 0) return
    setAlphaComp(0)
    await sleep(450)
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
    currentRef.current = sel; setCurrent(sel)
    const { w: W, h: H } = imgSizeRef.current
    await doComposite(sel, zns, W, H)
    setAlphaComp(1)
  }, [pool, doComposite])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => doRotate("next"), ROTATION_INTERVAL)
  }, [doRotate])

  useEffect(() => {
    if (phase !== "ready" || pool.length === 0) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, pool.length, resetTimer])

  // ── Touche D → debug ─────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "d" || e.key === "D") setDebugOn(v => !v) }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])

  // ─── Rendu ───────────────────────────────────────────────────────────────────

  if (!transparentUrl) {
    return (
      <section className="w-full flex items-center justify-center bg-stone-100" style={{ minHeight:180 }}>
        <p className="text-sm text-stone-400 font-serif italic">Uploadez le tableau depuis la page Import</p>
      </section>
    )
  }

  const { w: iW, h: iH } = imgSizeRef.current

  const DEBUG_COLORS = [
    "#e74c3c","#e67e22","#f1c40f","#2ecc71","#1abc9c",
    "#3498db","#9b59b6","#e91e63","#00bcd4","#8bc34a",
    "#ff5722","#607d8b","#ff9800","#4caf50","#673ab7",
  ]

  // Tri hover : grandes zones d'abord, petites par-dessus
  const sortedZones = [...zones].sort((a, b) => (b.bbox.w * b.bbox.h) - (a.bbox.w * a.bbox.h))

  return (
    <section className="relative w-full select-none"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}>

      <div className="relative w-full overflow-hidden" style={{ aspectRatio:`${iW} / ${iH}` }}>

        <canvas ref={canvasBaseRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:1, opacity:alphaBase, transition:"opacity 0.5s ease" }} />
        <canvas ref={canvasCompRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:2, opacity:alphaComp, transition:"opacity 0.4s ease" }} />

        {(phase === "loading" || phase === "detecting" || phase === "compositing") && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background:"rgba(245,241,232,0.75)" }}>
            <p className="font-serif text-sm italic text-stone-600">
              {phase === "loading"     && "Chargement du tableau…"}
              {phase === "detecting"   && "Détection des cadres…"}
              {phase === "compositing" && "Placement des luminaires…"}
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-100">
            <p className="font-serif text-sm italic text-red-400">Erreur de chargement du tableau</p>
          </div>
        )}

        {/* Debug overlay — touche D */}
        {debugOn && (
          <div className="absolute inset-0" style={{ zIndex:30 }}>
            {sortedZones.map(zone => {
              const color = DEBUG_COLORS[zone.id % DEBUG_COLORS.length]
              const isHov = hovDebug === zone.id
              const rot   = zone.rotation ?? 0
              const ins   = 3
              return (
                <div key={zone.id}
                  onMouseEnter={() => setHovDebug(zone.id)}
                  onMouseLeave={() => setHovDebug(null)}
                  style={{
                    position:"absolute",
                    left:   `calc(${(zone.bbox.x / iW)*100}% + ${ins}px)`,
                    top:    `calc(${(zone.bbox.y / iH)*100}% + ${ins}px)`,
                    width:  `calc(${(zone.bbox.w / iW)*100}% - ${ins*2}px)`,
                    height: `calc(${(zone.bbox.h / iH)*100}% - ${ins*2}px)`,
                    transform: rot ? `rotate(${rot}deg)` : undefined,
                    transformOrigin: "center center",
                    background: isHov ? color : `${color}99`,
                    border: `2px solid ${color}`,
                    boxSizing: "border-box",
                    transition: "background 0.15s",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, cursor:"default",
                  }}>
                  <span style={{ background:color, color:"#fff", fontSize:10, fontWeight:800, fontFamily:"monospace", padding:"1px 5px", borderRadius:3, lineHeight:1.4, textShadow:"0 1px 2px rgba(0,0,0,.6)", pointerEvents:"none" }}>
                    #{zone.id}
                  </span>
                  <span style={{ color:"#fff", fontSize:8, fontFamily:"monospace", textShadow:"0 1px 3px rgba(0,0,0,.9)", pointerEvents:"none", lineHeight:1.3 }}>
                    {zone.bbox.w}×{zone.bbox.h}
                  </span>
                </div>
              )
            })}
            <div style={{ position:"absolute", top:6, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,.82)", color:"#fff", fontSize:11, padding:"4px 12px", borderRadius:4, whiteSpace:"nowrap", fontFamily:"monospace", pointerEvents:"none" }}>
              DEBUG — {zones.length} zones — {hovDebug !== null ? `#${hovDebug} sélectionné` : "survol pour détails"} — D pour fermer
            </div>
          </div>
        )}
      </div>

      {/* Zones hover — hors overflow:hidden → tooltips non coupés */}
      {phase === "ready" && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex:5 }}>
          {sortedZones.map(zone => {
            const i     = zones.findIndex(z => z.id === zone.id)
            const lum   = current[i]
            const below = zone.bbox.y / iH < 0.4
            const rot   = zone.rotation ?? 0
            const handleEnter = () => {
              if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null }
              setHovZone(zone.id)
            }
            const handleLeave = () => {
              leaveTimerRef.current = setTimeout(() => setHovZone(null), 300)
            }
            return (
              <div key={zone.id} className="absolute"
                style={{
                  left:  `${(zone.bbox.x / iW)*100}%`, top:`${(zone.bbox.y / iH)*100}%`,
                  width: `${(zone.bbox.w / iW)*100}%`, height:`${(zone.bbox.h / iH)*100}%`,
                  transform: rot ? `rotate(${rot}deg)` : undefined,
                  transformOrigin: "center center",
                  pointerEvents:"auto", cursor:"default",
                }}
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}>
                {lum && (
                  <MuseumLabel
                    lum={lum}
                    visible={hovZone === zone.id}
                    below={below}
                    onEnter={handleEnter}
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
        style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", zIndex:10, width:38, height:38, borderRadius:"50%", background:"rgba(0,0,0,.28)", border:"none", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(4px)", opacity:hovering?(hasPrev?1:0.2):0, transition:"opacity .3s ease" }}>
        <ChevronLeft size={20} />
      </button>
      <button onClick={() => { resetTimer(); doRotate("next") }}
        aria-label="Sélection suivante"
        style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", zIndex:10, width:38, height:38, borderRadius:"50%", background:"rgba(0,0,0,.28)", border:"none", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(4px)", opacity:hovering?1:0, transition:"opacity .3s ease" }}>
        <ChevronRight size={20} />
      </button>
    </section>
  )
}
