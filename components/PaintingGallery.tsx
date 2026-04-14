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

  // Closing morphologique : comble les trous intérieurs (3 passes).
  // Pour chaque cellule isFrame=0, si ≥ 3 de ses 4 voisins directs sont isFrame=1 → isFrame=1.
  // Fusionne les zones formant un cadre ovale coupé en deux (ex: zones #29 et #30).
  {
    const next = new Uint8Array(gW * gH)
    for (let pass = 0; pass < 3; pass++) {
      next.set(isFrame)
      for (let cy = 1; cy < gH - 1; cy++) {
        for (let cx = 1; cx < gW - 1; cx++) {
          const ci = cy * gW + cx
          if (isFrame[ci] === 1) continue
          const neighbors =
            (isFrame[ci - 1]  ? 1 : 0) +
            (isFrame[ci + 1]  ? 1 : 0) +
            (isFrame[ci - gW] ? 1 : 0) +
            (isFrame[ci + gW] ? 1 : 0)
          if (neighbors >= 3) next[ci] = 1
        }
      }
      isFrame.set(next)
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

// Cache des ratios (naturalWidth/naturalHeight) des images luminaires déjà chargées
const imgRatioCache = new Map<string, number>()

function pickForZones(pool: GalleryLuminaire[], zones: FrameZone[]): GalleryLuminaire[] {
  if (pool.length === 0 || zones.length === 0) return []
  return zones.map(zone => {
    const zoneRatio = zone.bbox.w / zone.bbox.h
    // Filtre les luminaires dont le ratio image est connu et proche (±0.4)
    const candidates = pool.filter(lum => {
      const ratio = imgRatioCache.get(lum.imageUrl)
      if (ratio === undefined) return true  // ratio inconnu : inclus comme fallback
      return Math.abs(ratio - zoneRatio) <= 0.4
    })
    const src = candidates.length > 0 ? candidates : pool
    return src[(Math.random() * src.length) | 0]
  })
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

// ─── Compositing d'un luminaire dans une zone ────────────────────────────────────
// Masque radial canvas : centre net, bords fondus vers le crème du tableau.
// Filtre sepia(10%) contrast(1.05) : les blancs résiduels prennent une teinte ivoire.

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
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
    ]) as HTMLImageElement
  } catch { return }

  const { x: bx, y: by, w: bw, h: bh } = bbox
  const nW = img.naturalWidth, nH = img.naturalHeight

  // ── Détection de la bbox du sujet réel (ignore les pixels R,G,B > 230) ──────
  const detectCanvas = document.createElement("canvas")
  detectCanvas.width = nW; detectCanvas.height = nH
  detectCanvas.getContext("2d")!.drawImage(img, 0, 0)
  const rawData = detectCanvas.getContext("2d")!.getImageData(0, 0, nW, nH).data

  let sMinX = nW, sMaxX = 0, sMinY = nH, sMaxY = 0
  for (let py = 0; py < nH; py++) {
    for (let px = 0; px < nW; px++) {
      const idx = (py * nW + px) * 4
      const r = rawData[idx], g = rawData[idx + 1], b = rawData[idx + 2], a = rawData[idx + 3]
      if (a < 10 || (r > 230 && g > 230 && b > 230)) continue
      if (px < sMinX) sMinX = px; if (px > sMaxX) sMaxX = px
      if (py < sMinY) sMinY = py; if (py > sMaxY) sMaxY = py
    }
  }
  // Fallback sur l'image entière si aucun sujet détecté
  if (sMinX > sMaxX || sMinY > sMaxY) { sMinX = 0; sMaxX = nW - 1; sMinY = 0; sMaxY = nH - 1 }

  // Mise en cache du ratio pour pickForZones
  imgRatioCache.set(lumUrl, nW / nH)

  // Padding 5% autour de la bbox détectée
  const sbw = sMaxX - sMinX + 1, sbh = sMaxY - sMinY + 1
  const padPx = sbw * 0.05, padPy = sbh * 0.05
  const subX = Math.max(0, sMinX - padPx)
  const subY = Math.max(0, sMinY - padPy)
  const subW = Math.min(nW - subX, sbw + 2 * padPx)
  const subH = Math.min(nH - subY, sbh + 2 * padPy)

  // Canvas principal : fond crème
  const oc   = document.createElement("canvas")
  oc.width   = bw; oc.height = bh
  const octx = oc.getContext("2d")!
  octx.fillStyle = `rgb(${BG_R},${BG_G},${BG_B})`
  octx.fillRect(0, 0, bw, bh)

  // Scale basé sur la bbox du sujet (avec 10% de marge dans la zone)
  const pad    = 0.10
  const availW = bw * (1 - 2 * pad)
  const availH = bh * (1 - 2 * pad)
  const scale  = Math.min(availW / subW, availH / subH)
  const dw     = nW * scale
  const dh     = nH * scale
  // Centrage du sujet (pas de l'image entière) dans la zone
  const dx     = (bw - subW * scale) / 2 - subX * scale
  const dy     = (bh - subH * scale) / 2 - subY * scale

  // ── Luminaire : filtre chaud global (sepia + légère atténuation)
  octx.filter = "sepia(20%) brightness(0.96)"
  octx.drawImage(img, dx, dy, dw, dh)
  octx.filter = "none"

  // ── Tint agressif : ramène tous les pixels > 200 RGB vers #f5f0e8 ──────────
  const lumImgData = octx.getImageData(0, 0, bw, bh)
  const lumD       = lumImgData.data

  for (let i = 0; i < lumD.length; i += 4) {
    const r = lumD[i], g = lumD[i + 1], b = lumD[i + 2]
    const minCh = Math.min(r, g, b)
    if (minCh > 200) {
      const t = (minCh - 200) / 55   // 200→0, 255→1
      lumD[i]     = Math.round(r + (BG_R - r) * t)
      lumD[i + 1] = Math.round(g + (BG_G - g) * t)
      lumD[i + 2] = Math.round(b + (BG_B - b) * t)
    }
  }

  // ── 5. Copie dans le buffer base (uniquement sur les zones transparentes) ──
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

// ─── Debug palette ───────────────────────────────────────────────────────────────

const DEBUG_COLORS = [
  "#e74c3c","#e67e22","#f1c40f","#2ecc71","#1abc9c",
  "#3498db","#9b59b6","#e91e63","#00bcd4","#8bc34a",
  "#ff5722","#607d8b","#ff9800","#4caf50","#673ab7",
]

// ─── Museum label ────────────────────────────────────────────────────────────────

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
  const [zIndexA,       setZIndexA]       = useState(1)
  const [zIndexB,       setZIndexB]       = useState(1)
  const [hovZone,       setHovZone]       = useState<number | null>(null)
  const [hovering,      setHovering]      = useState(false)
  const [hasPrev,       setHasPrev]       = useState(false)
  const [debugZones,    setDebugZones]    = useState(false)
  const [hovDebug,      setHovDebug]      = useState<number | null>(null)

  const handleEnter = useCallback((id: number) => {
    if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null }
    setHovZone(id)
  }, [])

  const handleLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => setHovZone(null), 250)
  }, [])

  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

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

  const crossfadeTo = useCallback(async (
    sel: GalleryLuminaire[], zns: FrameZone[], W: number, H: number,
  ) => {
    const inactive     = activeRef.current === "A" ? "B" : "A"
    const targetCanvas = inactive === "A" ? canvasARef.current : canvasBRef.current
    if (!targetCanvas) return

    // 1. Composite onto the inactive canvas (currently hidden)
    await doComposite(sel, zns, W, H, targetCanvas)

    // 2. Bring inactive to front at opacity=0 (above active canvas)
    if (inactive === "A") {
      setZIndexA(2); setZIndexB(1); setAlphaA(0)
    } else {
      setZIndexA(1); setZIndexB(2); setAlphaB(0)
    }

    // 3. Short delay to let React commit the new z-index + opacity=0
    await sleep(50)

    // 4. Fade in the new canvas — old canvas stays at opacity=1 underneath (no bleed)
    if (inactive === "A") setAlphaA(1)
    else                  setAlphaB(1)

    // 5. Wait for CSS transition to complete
    await sleep(1500)

    // 6. Hide the now-stale canvas (fully covered by new, so invisible)
    if (inactive === "A") setAlphaB(0)
    else                  setAlphaA(0)

    activeRef.current = inactive
  }, [doComposite])

  useEffect(() => {
    if (!transparentUrl) return
    let cancelled = false
    setPhase("loading")
    setPaintingReady(false)
    origDataRef.current = null
    currentRef.current  = []
    setAlphaA(0); setAlphaB(0); setZIndexA(1); setZIndexB(1)

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

        // ── Zones : essai cache sessionStorage pour éviter la détection ──────
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
          detected = detectZonesGrid(origDataRef.current, W, H)
          console.log(`[PaintingGallery] ${detected.length} zones détectées`,
            detected.map(z => `#${z.id} @(${z.bbox.x},${z.bbox.y}) ${z.bbox.w}×${z.bbox.h}`))
          try { sessionStorage.setItem(cacheKey, JSON.stringify(detected)) } catch {}
        }

        if (cancelled) return
        zonesRef.current = detected
        setZones(detected)

        // ── Afficher le tableau brut immédiatement (sans luminaires) ─────────
        // L'utilisateur voit le tableau pendant que les luminaires se compositent en arrière-plan
        if (canvasARef.current) {
          const c = canvasARef.current
          c.width  = W; c.height = H
          const ctx = c.getContext("2d")!
          ctx.fillStyle = `rgb(${BG_R},${BG_G},${BG_B})`
          ctx.fillRect(0, 0, W, H)
          ctx.drawImage(img, 0, 0, W, H)
          activeRef.current = "A"
          setAlphaA(1)
        }

        setPaintingReady(true)
        setPhase("compositing")  // painting visible, luminaires en cours en arrière-plan
      } catch {
        if (!cancelled) setPhase("error")
      }
    })()

    return () => { cancelled = true }
  }, [transparentUrl])

  useEffect(() => {
    if (!paintingReady || pool.length === 0 || currentRef.current.length > 0) return
    ;(async () => {
      const zns  = zonesRef.current
      const { w: W, h: H } = imgSizeRef.current
      const sel  = pickForZones(pool, zns)
      currentRef.current = sel; historyRef.current = [sel]
      setHasPrev(false)

      const canvasB = canvasBRef.current!
      const canvasCacheKey = `pgc_${W}x${H}`

      // ── Essai restauration depuis cache (évite tout le compositing) ──────────
      let restoredFromCache = false
      try {
        const cached = sessionStorage.getItem(canvasCacheKey)
        if (cached) {
          const cachedImg = await loadImg(cached)
          canvasB.width = W; canvasB.height = H
          canvasB.getContext("2d")!.drawImage(cachedImg, 0, 0)
          restoredFromCache = true
        }
      } catch {}

      // ── Compositing complet si pas de cache ──────────────────────────────────
      if (!restoredFromCache) {
        await doComposite(sel, zns, W, H, canvasB)
        // Sauvegarder le résultat pour les prochaines visites
        try {
          const dataUrl = canvasB.toDataURL("image/jpeg", 0.78)
          sessionStorage.setItem(canvasCacheKey, dataUrl)
        } catch {}
      }

      // Crossfade du tableau brut (A) vers la version avec luminaires (B)
      setZIndexB(2); setZIndexA(1); setAlphaB(0)
      await sleep(50)
      setAlphaB(1)
      await sleep(1500)
      setAlphaA(0)
      activeRef.current = "B"

      setCurrent(sel)
      setPhase("ready")
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, paintingReady, doComposite])

  const doRotate = useCallback(async (dir: "next"|"prev") => {
    if (pool.length === 0 || !origDataRef.current) return
    const zns = zonesRef.current
    if (zns.length === 0) return
    const { w: W, h: H } = imgSizeRef.current
    let sel: GalleryLuminaire[]
    if (dir === "next") {
      sel = pickForZones(pool, zns)
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
      style={{ isolation: "isolate" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative w-full overflow-hidden"
        style={{ aspectRatio:`${iW} / ${iH}`, background:`rgb(${BG_R},${BG_G},${BG_B})` }}>

        <canvas ref={canvasARef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:zIndexA, opacity:alphaA, transition:"opacity 1.5s ease" }} />
        <canvas ref={canvasBRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:zIndexB, opacity:alphaB, transition:"opacity 1.5s ease" }} />

        {debugZones && (
          <div className="absolute inset-0" style={{ zIndex:30 }}>
            {zones.map(zone => {
              const color = DEBUG_COLORS[zone.id % DEBUG_COLORS.length]
              const isHov = hovDebug === zone.id
              return (
                <div
                  key={zone.id}
                  onMouseEnter={() => setHovDebug(zone.id)}
                  onMouseLeave={() => setHovDebug(null)}
                  style={{
                    position:       "absolute",
                    left:           `${(zone.bbox.x / iW) * 100}%`,
                    top:            `${(zone.bbox.y / iH) * 100}%`,
                    width:          `${(zone.bbox.w / iW) * 100}%`,
                    height:         `${(zone.bbox.h / iH) * 100}%`,
                    background:     isHov ? color : `${color}99`,
                    border:         `2px solid ${color}`,
                    boxSizing:      "border-box",
                    transition:     "background 0.15s",
                    display:        "flex",
                    flexDirection:  "column",
                    alignItems:     "center",
                    justifyContent: "center",
                    gap:            2,
                    cursor:         "default",
                  }}
                >
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

        {/* Overlay bloquant uniquement pendant loading/detecting — compositing se fait en arrière-plan */}
        {(phase === "loading" || phase === "detecting") && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background:"rgba(245,241,232,0.75)" }}>
            <p className="font-serif text-sm italic text-stone-600">
              {phase === "loading" ? "Chargement du tableau…" : "Détection des cadres…"}
            </p>
          </div>
        )}

        {/* Petit indicateur discret pendant le compositing des luminaires */}
        {phase === "compositing" && (
          <div style={{
            position:"absolute", bottom:12, right:14, zIndex:15,
            background:"rgba(245,241,232,0.82)", backdropFilter:"blur(4px)",
            borderRadius:20, padding:"4px 12px",
            fontFamily:"Georgia,serif", fontSize:"0.7rem",
            color:"#7a6654", fontStyle:"italic", pointerEvents:"none",
          }}>
            Placement des luminaires…
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
