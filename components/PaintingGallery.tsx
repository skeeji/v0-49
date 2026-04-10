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
const MIN_ZONE_PIXELS    = 400
const MAX_ZONE_FRACTION  = 0.25   // ignore zones > 25 % de l'image (fond global)

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

// ─── Détection automatique des zones transparentes (BFS sur canal alpha) ─────────
// Identique à la détection BFS verte de v18, mais sur alpha < 128 au lieu de vert.
// → retrouve exactement les mêmes cadres, dans le même ordre.

function detectTransparentZones(data: Uint8ClampedArray, W: number, H: number): FrameZone[] {
  const visited = new Uint8Array(W * H)
  const raw: FrameZone[] = []
  const totalPx = W * H

  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const si = sy * W + sx
      if (visited[si]) continue
      if (data[si * 4 + 3] >= 128) continue   // pixel opaque → pas un cadre

      const q: number[] = [si]
      visited[si] = 1
      let qi = 0, count = 0
      let x0 = sx, x1 = sx, y0 = sy, y1 = sy

      while (qi < q.length) {
        const ci = q[qi++]; count++
        const cy = (ci / W) | 0, cx = ci % W
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx
        if (cy < y0) y0 = cy; if (cy > y1) y1 = cy

        if (cx > 0)     { const n = ci-1; if (!visited[n] && data[n*4+3]<128) { visited[n]=1; q.push(n) } }
        if (cx < W-1)   { const n = ci+1; if (!visited[n] && data[n*4+3]<128) { visited[n]=1; q.push(n) } }
        if (cy > 0)     { const n = ci-W; if (!visited[n] && data[n*4+3]<128) { visited[n]=1; q.push(n) } }
        if (cy < H-1)   { const n = ci+W; if (!visited[n] && data[n*4+3]<128) { visited[n]=1; q.push(n) } }
      }

      if (count < MIN_ZONE_PIXELS) continue
      if (count > totalPx * MAX_ZONE_FRACTION) continue

      raw.push({ id: raw.length, bbox: { x: x0, y: y0, w: x1-x0+1, h: y1-y0+1 } })
    }
  }

  // Fusionner les bounding-boxes qui se chevauchent (cadre ovale en 2 composantes)
  const merged = mergeOverlapping(raw)

  const result = merged
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
    .map((z, i) => ({ ...z, id: i }))

  console.log(`[PaintingGallery] ${result.length} zones détectées`,
    result.map(z => `#${z.id} x=${z.bbox.x} y=${z.bbox.y} ${z.bbox.w}×${z.bbox.h}`))

  return result
}

function mergeOverlapping(zones: FrameZone[]): FrameZone[] {
  const list = zones.map(z => ({ ...z, bbox: { ...z.bbox } }))
  let changed = true
  while (changed) {
    changed = false
    outer: for (let i = 0; i < list.length; i++) {
      for (let j = i+1; j < list.length; j++) {
        const a = list[i].bbox, b = list[j].bbox
        if (a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y) {
          const x0=Math.min(a.x,b.x), y0=Math.min(a.y,b.y)
          const x1=Math.max(a.x+a.w,b.x+b.w), y1=Math.max(a.y+a.h,b.y+b.h)
          list[i] = { id: list[i].id, bbox: { x:x0, y:y0, w:x1-x0, h:y1-y0 } }
          list.splice(j,1); changed=true; break outer
        }
      }
    }
  }
  return list
}

// ─── Rendu canvas ────────────────────────────────────────────────────────────────
//
//  1. Fond beige sur le canvas
//  2. Chaque luminaire dessiné dans sa zone (off-screen + multiply pour fond blanc)
//  3. Tableau RGBA par-dessus : pixels opaques = peinture, transparents = luminaire
//
// → même résultat visuel qu'avec le fond vert, mais avec le canal alpha natif.

async function renderComposite(
  canvas:   HTMLCanvasElement,
  painting: HTMLImageElement,
  zones:    FrameZone[],
  sel:      GalleryLuminaire[],
  W:        number,
  H:        number,
): Promise<void> {
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  // 1. Fond beige
  ctx.fillStyle = "#f5f0e8"
  ctx.fillRect(0, 0, W, H)

  // 2. Luminaires en parallèle
  await Promise.all(
    zones.map(async (zone, i) => {
      const lum = sel[i]
      if (!lum) return

      let img: HTMLImageElement
      try {
        img = await Promise.race([
          loadImg(lum.imageUrl),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
        ]) as HTMLImageElement
      } catch { return }

      const { x: zx, y: zy, w: zw, h: zh } = zone.bbox
      if (zw < 2 || zh < 2) return

      // Canvas off-screen : fond beige + multiply → blanc devient beige (GPU, pas de boucle)
      const oc     = document.createElement("canvas")
      oc.width     = zw
      oc.height    = zh
      const oc_ctx = oc.getContext("2d")!
      oc_ctx.imageSmoothingEnabled = true
      oc_ctx.imageSmoothingQuality = "high"

      oc_ctx.fillStyle = "#f5f0e8"
      oc_ctx.fillRect(0, 0, zw, zh)
      oc_ctx.globalCompositeOperation = "multiply"

      // object-fit: contain avec 10 % de marge — préserve l'orientation
      const pad    = 0.10
      const availW = zw * (1 - 2*pad)
      const availH = zh * (1 - 2*pad)
      const scale  = Math.min(availW / img.naturalWidth, availH / img.naturalHeight)
      const dw     = img.naturalWidth  * scale
      const dh     = img.naturalHeight * scale
      const dx     = (zw - dw) / 2
      const dy     = (zh - dh) / 2

      oc_ctx.drawImage(img, dx, dy, dw, dh)
      oc_ctx.globalCompositeOperation = "source-over"

      ctx.drawImage(oc, zx, zy)
    })
  )

  // 3. Tableau RGBA par-dessus
  ctx.drawImage(painting, 0, 0, W, H)
}

// ─── Museum label ────────────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: { lum: GalleryLuminaire; visible: boolean; below: boolean }) {
  const pos     = below ? { top:"calc(100% + 6px)", bottom:"auto" } : { bottom:"calc(100% + 6px)", top:"auto" }
  const aOut    = below
    ? { top:-7, bottom:"auto", borderBottom:"7px solid #b8974a", borderTop:"none" }
    : { bottom:-7, top:"auto", borderTop:"7px solid #b8974a", borderBottom:"none" }
  const aIn     = below
    ? { top:-5, bottom:"auto", borderBottom:"6px solid #f0e6c0", borderTop:"none" }
    : { bottom:-5, top:"auto", borderTop:"6px solid #f0e6c0", borderBottom:"none" }
  return (
    <div className="pointer-events-none absolute z-50"
      style={{ ...pos, left:"50%", transform:"translateX(-50%)", minWidth:150, maxWidth:200, opacity:visible?1:0, transition:"opacity 0.2s ease" }}>
      <div style={{ background:"linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)", border:"1px solid #b8974a", borderRadius:2, padding:"8px 10px", boxShadow:"0 2px 10px rgba(0,0,0,.35)", position:"relative" }}>
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", ...aOut }} />
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", ...aIn }} />
        <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:11, fontWeight:600, color:"#3d2b0a", lineHeight:1.3 }}>{lum.nom}</p>
        {lum.designer && <p style={{ fontFamily:"Georgia,serif", fontSize:10, fontStyle:"italic", color:"#6b4f1a", marginTop:2 }}>{lum.designer}</p>}
        {lum.annee    && <p style={{ fontFamily:"Georgia,serif", fontSize:9,  color:"#7a5c20",  marginTop:1  }}>{lum.annee}</p>}
        <Link href={`/luminaires/${lum._id}`} target="_blank" rel="noopener noreferrer"
          className="pointer-events-auto block mt-1"
          style={{ fontFamily:"Georgia,serif", fontSize:9, color:"#5a3a10", textDecoration:"underline" }}>
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────────

export function PaintingGallery({ transparentUrl }: { transparentUrl?: string }) {

  const canvasARef   = useRef<HTMLCanvasElement>(null)
  const canvasBRef   = useRef<HTMLCanvasElement>(null)
  const activeRef    = useRef<"A"|"B">("A")
  const paintingRef  = useRef<HTMLImageElement | null>(null)
  const imgSizeRef   = useRef({ w: 1330, h: 876 })
  const zonesRef     = useRef<FrameZone[]>([])

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

  const historyRef = useRef<GalleryLuminaire[][]>([])
  const currentRef = useRef<GalleryLuminaire[]>([])
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Pool ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

  // ── Chargement tableau + détection zones ─────────────────────────────────────────
  useEffect(() => {
    if (!transparentUrl) return
    let cancelled = false
    setPhase("loading")
    setPaintingReady(false)

    ;(async () => {
      try {
        const img = await loadImg(transparentUrl)
        if (cancelled) return

        const W = img.naturalWidth, H = img.naturalHeight
        paintingRef.current = img
        imgSizeRef.current  = { w: W, h: H }
        setImgSize({ w: W, h: H })

        // Détecter les zones depuis le canal alpha (même BFS que fond vert)
        setPhase("detecting")
        const tmp = document.createElement("canvas")
        tmp.width = W; tmp.height = H
        tmp.getContext("2d")!.drawImage(img, 0, 0)
        const { data } = tmp.getContext("2d")!.getImageData(0, 0, W, H)
        const detected = detectTransparentZones(data, W, H)

        if (cancelled) return
        zonesRef.current = detected
        setZones(detected)
        setPaintingReady(true)   // déclenche la composition via useEffect
      } catch {
        if (!cancelled) setPhase("error")
      }
    })()

    return () => { cancelled = true }
  }, [transparentUrl])

  // ── Première composition dès que tableau + pool + zones sont prêts ───────────────
  useEffect(() => {
    if (!paintingReady || pool.length === 0 || zonesRef.current.length === 0 || currentRef.current.length > 0) return
    ;(async () => {
      const zns = zonesRef.current
      const sel = pickRandom(pool, zns.length)
      currentRef.current = sel
      historyRef.current = [sel]
      setCurrent(sel)
      setHasPrev(false)

      setPhase("compositing")
      const { w: W, h: H } = imgSizeRef.current
      await renderComposite(canvasARef.current!, paintingRef.current!, zns, sel, W, H)
      activeRef.current = "A"
      setAlphaA(1); setAlphaB(0)
      setPhase("ready")
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, paintingReady])

  // ── Rotation avec crossfade A↔B ──────────────────────────────────────────────────
  const doRotate = useCallback(async (dir: "next"|"prev") => {
    if (pool.length === 0 || !paintingRef.current) return
    const zns = zonesRef.current
    if (zns.length === 0) return

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
    currentRef.current = sel
    setCurrent(sel)

    const inactive     = activeRef.current === "A" ? "B" : "A"
    const targetCanvas = inactive === "A" ? canvasARef.current! : canvasBRef.current!
    const { w: W, h: H } = imgSizeRef.current

    await renderComposite(targetCanvas, paintingRef.current!, zns, sel, W, H)

    if (inactive === "A") { setAlphaA(1); setAlphaB(0) }
    else                  { setAlphaA(0); setAlphaB(1) }

    await sleep(850)
    activeRef.current = inactive
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

  // ─────────────────────────────────────────────────────────────────────────────────

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
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${iW} / ${iH}` }}>

        {/* Tableau affiché immédiatement pendant le chargement */}
        <img src={transparentUrl} alt="" aria-hidden
          className="absolute inset-0 w-full h-full block"
          style={{ objectFit:"fill", zIndex:0 }}
        />

        {/* Canvas A — crossfade */}
        <canvas ref={canvasARef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:1, opacity:alphaA, transition:"opacity 0.8s ease" }}
        />
        {/* Canvas B — crossfade */}
        <canvas ref={canvasBRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:1, opacity:alphaB, transition:"opacity 0.8s ease" }}
        />

        {(phase === "loading" || phase === "detecting" || phase === "compositing") && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background:"rgba(245,241,232,0.70)" }}>
            <p className="font-serif text-sm italic text-stone-500">
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

      </div>

      {/* Zones interactives — hors overflow-hidden pour les tooltips */}
      {phase === "ready" && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex:5 }}>
          {zones.map((zone, i) => {
            const lum   = current[i]
            const below = zone.bbox.y / iH < 0.4
            return (
              <div key={zone.id} className="absolute cursor-pointer"
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
