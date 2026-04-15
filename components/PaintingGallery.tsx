"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────────

interface GalleryLuminaire {
  _id:      string
  nom:      string
  designer: string
  annee:    string | number
  imageUrl: string
}

interface FrameZone {
  id:        number
  bbox:      { x: number; y: number; w: number; h: number }
  pixels:    Uint32Array   // indices absolus des pixels transparents dans l'image W×H
  rotation?: number        // degrés (affichage debug + zone hover)
}

// ─── Constantes ──────────────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 30_000
const MIN_ZONE_PIXELS   = 400
const ALPHA_THRESHOLD   = 128
// Fond beige-gris chaud pour remplir les zones vides entre deux rotations
const BG_R = 184, BG_G = 168, BG_B = 152   // #b8a898

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
    const merged = new Uint32Array(z29.pixels.length + z30.pixels.length)
    merged.set(z29.pixels)
    merged.set(z30.pixels, z29.pixels.length)
    z29.bbox   = { x, y, w: x2 - x, h: y2 - y }
    z29.pixels = merged
    result = result.filter(z => z.id !== 30)
  }

  result = result.map(z => z.id === 29 ? { ...z, rotation: 15 } : z)
  return result
}

// ─── Détection BFS pixel-exact des zones transparentes ───────────────────────────

function detectZones(data: Uint8ClampedArray, W: number, H: number): FrameZone[] {
  const visited = new Uint8Array(W * H)
  const zones: FrameZone[] = []

  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const si = sy * W + sx
      if (visited[si] || data[si * 4 + 3] >= ALPHA_THRESHOLD) continue

      const pixels: number[] = []
      const q: number[] = [si]
      visited[si] = 1
      let qi = 0
      let x0 = sx, x1 = sx, y0 = sy, y1 = sy

      while (qi < q.length) {
        const ci = q[qi++]
        pixels.push(ci)
        const cy = (ci / W) | 0, cx = ci % W
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx
        if (cy < y0) y0 = cy; if (cy > y1) y1 = cy
        if (cx > 0)     { const n = ci - 1; if (!visited[n] && data[n*4+3] < ALPHA_THRESHOLD) { visited[n]=1; q.push(n) } }
        if (cx < W - 1) { const n = ci + 1; if (!visited[n] && data[n*4+3] < ALPHA_THRESHOLD) { visited[n]=1; q.push(n) } }
        if (cy > 0)     { const n = ci - W; if (!visited[n] && data[n*4+3] < ALPHA_THRESHOLD) { visited[n]=1; q.push(n) } }
        if (cy < H - 1) { const n = ci + W; if (!visited[n] && data[n*4+3] < ALPHA_THRESHOLD) { visited[n]=1; q.push(n) } }
      }

      if (pixels.length < MIN_ZONE_PIXELS) continue

      zones.push({
        id:     zones.length,
        bbox:   { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 },
        pixels: new Uint32Array(pixels),
      })
    }
  }

  return zones
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
    .map((z, i) => ({ ...z, id: i }))
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

// ─── Composite un luminaire détouré dans le buffer de sortie ─────────────────────
// Respecte le canal alpha de l'image source (fond transparent natif).
// Feathering 1px sur les bords de la zone pour fondre avec le tableau.

async function compositeZone(
  output:   Uint8ClampedArray,   // buffer W×H transparent (partagé toutes zones)
  zone:     FrameZone,
  lumUrl:   string,
  W:        number,
): Promise<void> {
  const { x, y, w, h } = zone.bbox

  let img: HTMLImageElement
  try {
    img = await Promise.race([
      loadImg(lumUrl),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
    ]) as HTMLImageElement
  } catch { return }

  // Dessiner le luminaire à la taille de la bbox
  const oc   = document.createElement("canvas")
  oc.width   = w; oc.height = h
  const octx = oc.getContext("2d")!
  octx.imageSmoothingEnabled = true
  octx.imageSmoothingQuality = "high"
  octx.drawImage(img, 0, 0, w, h)
  const d = octx.getImageData(0, 0, w, h).data

  // Masque : quels pixels locaux appartiennent à la zone
  const mask = new Uint8Array(w * h)
  for (let k = 0; k < zone.pixels.length; k++) {
    const pi = zone.pixels[k]
    mask[((pi / W | 0) - y) * w + (pi % W - x)] = 1
  }

  // Écriture pixel par pixel en respectant l'alpha du luminaire
  for (let k = 0; k < zone.pixels.length; k++) {
    const pi       = zone.pixels[k]
    const px       = pi % W
    const py       = pi / W | 0
    const lx       = px - x
    const ly       = py - y
    const li       = (ly * w + lx) * 4
    const bi       = pi * 4
    const lumAlpha = d[li + 3]

    if (lumAlpha === 0) continue   // pixel transparent du luminaire → fond tableau visible

    const isBorder =
      (lx === 0     || !mask[ly * w + lx - 1])        ||
      (lx === w - 1 || !mask[ly * w + lx + 1])        ||
      (ly === 0     || !mask[(ly - 1) * w + lx])      ||
      (ly === h - 1 || !mask[(ly + 1) * w + lx])

    const alpha = isBorder ? Math.round(lumAlpha * 0.55) : lumAlpha

    output[bi]     = d[li]
    output[bi + 1] = d[li + 1]
    output[bi + 2] = d[li + 2]
    output[bi + 3] = alpha
  }
}

// ─── DPR-aware putImageData ───────────────────────────────────────────────────────

function putDPR(canvas: HTMLCanvasElement, data: Uint8ClampedArray, W: number, H: number, clear: boolean): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width  = W * dpr
  canvas.height = H * dpr
  const tmp     = document.createElement("canvas")
  tmp.width = W; tmp.height = H
  tmp.getContext("2d")!.putImageData(new ImageData(data, W, H), 0, 0)
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  if (clear) ctx.clearRect(0, 0, W * dpr, H * dpr)
  ctx.drawImage(tmp, 0, 0, W * dpr, H * dpr)
}

// ─── Museum label ─────────────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: { lum: GalleryLuminaire; visible: boolean; below: boolean }) {
  const pos  = below ? { top: "calc(100% + 6px)" } : { bottom: "calc(100% + 6px)" }
  const arrO = below
    ? { top: -7,  borderBottom: "7px solid #b8974a", borderTop: "none" }
    : { bottom: -7, borderTop: "7px solid #b8974a",  borderBottom: "none" }
  const arrI = below
    ? { top: -5,  borderBottom: "6px solid #f0e6c0", borderTop: "none" }
    : { bottom: -5, borderTop: "6px solid #f0e6c0",  borderBottom: "none" }
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ ...pos, left: "50%", transform: "translateX(-50%)", minWidth: 150, maxWidth: 200, opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
    >
      <div style={{ background: "linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)", border: "1px solid #b8974a", borderRadius: 2, padding: "8px 10px", boxShadow: "0 2px 10px rgba(0,0,0,.35)", position: "relative" }}>
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", ...arrO }} />
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", ...arrI }} />
        <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:11, fontWeight:600, color:"#3d2b0a", lineHeight:1.3, margin:0 }}>{lum.nom}</p>
        {lum.designer && <p style={{ fontFamily:"Georgia,serif", fontSize:10, fontStyle:"italic", color:"#6b4f1a", marginTop:2, marginBottom:0 }}>{lum.designer}</p>}
        {lum.annee    && <p style={{ fontFamily:"Georgia,serif", fontSize:9,  color:"#7a5c20",  marginTop:1,  marginBottom:0 }}>{lum.annee}</p>}
        <Link href={`/luminaires/${lum._id}`} target="_blank" rel="noopener noreferrer"
          className="pointer-events-auto block mt-1"
          style={{ fontFamily:"Georgia,serif", fontSize:9, color:"#5a3a10", textDecoration:"underline" }}
          onClick={e => e.stopPropagation()}
        >
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────────

export function PaintingGallery({ transparentUrl }: { transparentUrl?: string }) {

  // canvas base  : tableau + zones vides (beige) — permanent, ne change jamais
  // canvas comp  : luminaires uniquement — crossfade à chaque rotation
  const canvasBaseRef = useRef<HTMLCanvasElement>(null)
  const canvasCompRef = useRef<HTMLCanvasElement>(null)

  const zonesRef    = useRef<FrameZone[]>([])
  const imgSizeRef  = useRef({ w: 1330, h: 876 })
  const historyRef  = useRef<GalleryLuminaire[][]>([])
  const currentRef  = useRef<GalleryLuminaire[]>([])
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // ── Charger le pool depuis la galerie dédiée ───────────────────────────────────
  useEffect(() => {
    fetch("/api/galerie/luminaires")
      .then(r => r.json())
      .then(d => { if (d.success && d.luminaires.length > 0) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

  // ── Composite sur canvasComp (buffer transparent) ─────────────────────────────
  const doComposite = useCallback(async (
    sel: GalleryLuminaire[],
    zns: FrameZone[],
    W:   number,
    H:   number,
  ) => {
    if (!canvasCompRef.current) return
    const output = new Uint8ClampedArray(W * H * 4)  // tout transparent

    await Promise.all(
      zns.map((zone, i) =>
        sel[i] ? compositeZone(output, zone, sel[i].imageUrl, W) : Promise.resolve()
      )
    )
    putDPR(canvasCompRef.current, output, W, H, true)
  }, [])

  // ── Chargement du tableau + détection ────────────────────────────────────────
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

        // Récupérer les pixels du PNG
        const tmp = document.createElement("canvas")
        tmp.width = W; tmp.height = H
        tmp.getContext("2d")!.drawImage(img, 0, 0)
        const imgData = tmp.getContext("2d")!.getImageData(0, 0, W, H)

        setPhase("detecting")
        await sleep(16)
        if (cancelled) return

        let detected = detectZones(imgData.data, W, H)
        console.log(`[PaintingGallery] ${detected.length} zones`, detected.map(z => `#${z.id} ${z.bbox.w}×${z.bbox.h} (${z.pixels.length}px)`))
        detected = applyZonePatches(detected)
        zonesRef.current = detected
        setZones(detected)

        // ── canvasBase : tableau avec zones remplies en beige ────────────────────
        const baseData = new Uint8ClampedArray(imgData.data)
        for (const zone of detected) {
          for (let k = 0; k < zone.pixels.length; k++) {
            const bi = zone.pixels[k] * 4
            baseData[bi] = BG_R; baseData[bi+1] = BG_G; baseData[bi+2] = BG_B; baseData[bi+3] = 255
          }
        }
        // Remplir les pixels encore transparents avec le beige
        for (let i = 0; i < baseData.length; i += 4) {
          if (baseData[i+3] < ALPHA_THRESHOLD) {
            baseData[i] = BG_R; baseData[i+1] = BG_G; baseData[i+2] = BG_B; baseData[i+3] = 255
          }
        }
        putDPR(canvasBaseRef.current!, baseData, W, H, false)
        setAlphaBase(1)   // fond visible immédiatement, ne change plus

        if (!cancelled) setPhase(pool.length > 0 ? "compositing" : "ready")
      } catch (e) {
        console.error("[PaintingGallery]", e)
        if (!cancelled) setPhase("error")
      }
    })()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transparentUrl])

  // ── Premier composite quand pool + zones sont prêts ──────────────────────────
  useEffect(() => {
    if (pool.length === 0 || zonesRef.current.length === 0 || currentRef.current.length > 0) return
    ;(async () => {
      const { w: W, h: H } = imgSizeRef.current
      const sel = pickRandom(pool, zonesRef.current.length)
      currentRef.current = sel; historyRef.current = [sel]
      setCurrent(sel); setHasPrev(false)
      setPhase("compositing")
      await doComposite(sel, zonesRef.current, W, H)
      setAlphaComp(1)
      setPhase("ready")
    })()
  }, [pool, doComposite])

  // ── Rotation ────────────────────────────────────────────────────────────────
  const doRotate = useCallback(async (dir: "next" | "prev") => {
    const zns = zonesRef.current
    if (zns.length === 0 || pool.length === 0) return

    // Fade out
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
    currentRef.current = sel
    setCurrent(sel)

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

  // ── Touche D → debug overlay ─────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "d" || e.key === "D") setDebugOn(v => !v) }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])

  // ── Rendu ───────────────────────────────────────────────────────────────────

  if (!transparentUrl) {
    return (
      <section className="w-full flex items-center justify-center bg-stone-100" style={{ minHeight: 180 }}>
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

  return (
    <section
      className="relative w-full select-none"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${iW} / ${iH}` }}>

        {/* Fond permanent : tableau + zones beige */}
        <canvas ref={canvasBaseRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block",
                   zIndex:1, opacity:alphaBase, transition:"opacity 0.5s ease" }}
        />

        {/* Composite luminaires uniquement — crossfade ici */}
        <canvas ref={canvasCompRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block",
                   zIndex:2, opacity:alphaComp, transition:"opacity 0.4s ease" }}
        />

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
            {zones.map(zone => {
              const color = DEBUG_COLORS[zone.id % DEBUG_COLORS.length]
              const isHov = hovDebug === zone.id
              const rot   = zone.rotation ?? 0
              return (
                <div key={zone.id}
                  onMouseEnter={() => setHovDebug(zone.id)}
                  onMouseLeave={() => setHovDebug(null)}
                  style={{
                    position:        "absolute",
                    left:            `${(zone.bbox.x / iW) * 100}%`,
                    top:             `${(zone.bbox.y / iH) * 100}%`,
                    width:           `${(zone.bbox.w / iW) * 100}%`,
                    height:          `${(zone.bbox.h / iH) * 100}%`,
                    transform:        rot ? `rotate(${rot}deg)` : undefined,
                    transformOrigin: "center center",
                    background:      isHov ? color : `${color}99`,
                    border:          `2px solid ${color}`,
                    boxSizing:       "border-box",
                    transition:      "background 0.15s",
                    display:         "flex",
                    flexDirection:   "column",
                    alignItems:      "center",
                    justifyContent:  "center",
                    gap:             2,
                    cursor:          "default",
                  }}
                >
                  <span style={{ background:color, color:"#fff", fontSize:10, fontWeight:800, fontFamily:"monospace", padding:"1px 5px", borderRadius:3, lineHeight:1.4, textShadow:"0 1px 2px rgba(0,0,0,.6)", pointerEvents:"none" }}>
                    #{zone.id}
                  </span>
                  <span style={{ color:"#fff", fontSize:8, fontFamily:"monospace", textShadow:"0 1px 3px rgba(0,0,0,.9)", pointerEvents:"none", lineHeight:1.3 }}>
                    {zone.bbox.w}×{zone.bbox.h} ({zone.pixels.length}px)
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

      {/* Zones hover — en dehors du overflow:hidden pour que les tooltips ne soient pas coupés */}
      {phase === "ready" && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex:5 }}>
          {zones.map((zone, i) => {
            const lum   = current[i]
            const below = zone.bbox.y / iH < 0.4
            const rot   = zone.rotation ?? 0
            return (
              <div key={zone.id} className="absolute"
                style={{
                  left:            `${(zone.bbox.x / iW) * 100}%`,
                  top:             `${(zone.bbox.y / iH) * 100}%`,
                  width:           `${(zone.bbox.w / iW) * 100}%`,
                  height:          `${(zone.bbox.h / iH) * 100}%`,
                  transform:        rot ? `rotate(${rot}deg)` : undefined,
                  transformOrigin: "center center",
                  pointerEvents:   "auto",
                  cursor:          "default",
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
