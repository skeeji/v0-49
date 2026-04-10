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

interface GreenZone {
  id: number
  bbox: { x: number; y: number; w: number; h: number }
  pixels: Uint32Array
}

// ─── Constantes ─────────────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 30_000
const MIN_ZONE_PIXELS   = 400
// Fond neutre pour les zones vertes dans canvasBase (#b8a898 beige-gris chaud)
const BASE_R = 184, BASE_G = 168, BASE_B = 152

// ─── Utilitaires purs ───────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/** Fix 3 — seuil élargi pour capturer les pixels anti-aliasés en bordure */
function isGreenPx(r: number, g: number, b: number): boolean {
  return g > 80 && g > r * 1.3 && g > b * 1.3
}

/** Retourne exactement n items en cyclant sur le pool si nécessaire */
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
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error(`Cannot load: ${src}`))
    img.src     = src
  })
}

// ─── Détection des zones vertes par BFS ─────────────────────────────────────────

function detectGreenZones(data: Uint8ClampedArray, W: number, H: number): GreenZone[] {
  const visited = new Uint8Array(W * H)
  const zones: GreenZone[] = []

  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const si = sy * W + sx
      if (visited[si]) continue
      const r = data[si * 4], g = data[si * 4 + 1], b = data[si * 4 + 2]
      if (!isGreenPx(r, g, b)) continue

      const pixels: number[] = []
      const q: number[] = [si]
      visited[si] = 1
      let qi = 0

      while (qi < q.length) {
        const ci = q[qi++]
        pixels.push(ci)
        const cy = (ci / W) | 0
        const cx = ci % W
        if (cx > 0)     { const n = ci - 1; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
        if (cx < W - 1) { const n = ci + 1; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
        if (cy > 0)     { const n = ci - W; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
        if (cy < H - 1) { const n = ci + W; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
      }

      if (pixels.length < MIN_ZONE_PIXELS) continue

      let x0 = W, x1 = 0, y0 = H, y1 = 0
      for (const i of pixels) {
        const py = (i / W) | 0, px = i % W
        if (px < x0) x0 = px; if (px > x1) x1 = px
        if (py < y0) y0 = py; if (py > y1) y1 = py
      }

      zones.push({
        id: zones.length,
        bbox: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 },
        pixels: new Uint32Array(pixels),
      })
    }
  }

  return zones.sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
}

// ─── Fix 2 + 3 + 4 — Composite un luminaire dans le buffer de sortie ─────────────

async function compositeZone(
  output: Uint8ClampedArray,      // buffer transparent W×H (toutes zones partagées)
  zone: GreenZone,
  lumUrl: string,
  W: number,
  H: number,
  origData: Uint8ClampedArray     // fond de base (vert→beige) pour le feathering
): Promise<void> {
  const { x, y, w, h } = zone.bbox

  let img: HTMLImageElement
  try { img = await loadImg(lumUrl) } catch { return }

  // Fix 2 — canvas off-screen avec imageSmoothingQuality 'high'
  const oc = document.createElement("canvas")
  oc.width = w; oc.height = h
  const ctx = oc.getContext("2d")!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, w, h)

  const d = ctx.getImageData(0, 0, w, h).data

  // Fix 4 — suppression fond blanc avec transition douce vers #b8a898
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const whiteness = Math.min(r, g, b) / 255
    if (whiteness > 0.88) {
      d[i] = BASE_R; d[i + 1] = BASE_G; d[i + 2] = BASE_B
    } else if (whiteness > 0.70) {
      const t = (whiteness - 0.70) / 0.18
      d[i]     = Math.round(r + (BASE_R - r) * t)
      d[i + 1] = Math.round(g + (BASE_G - g) * t)
      d[i + 2] = Math.round(b + (BASE_B - b) * t)
    }
  }

  // Fix 3 — masque bbox pour détection des pixels de bordure
  const mask = new Uint8Array(w * h)
  for (let k = 0; k < zone.pixels.length; k++) {
    const pi = zone.pixels[k]
    mask[(((pi / W) | 0) - y) * w + (pi % W - x)] = 1
  }

  // Écriture dans le buffer de sortie + feathering sur les bords
  for (let zi = 0; zi < zone.pixels.length; zi++) {
    const pi  = zone.pixels[zi]
    const px  = pi % W
    const py  = (pi / W) | 0
    const lx  = px - x
    const ly  = py - y
    const li  = (ly * w + lx) * 4
    const bi  = pi * 4

    // Pixel de bordure = au moins un voisin hors du masque
    const isBorder =
      (lx === 0 || !mask[ly * w + lx - 1]) ||
      (lx === w - 1 || !mask[ly * w + lx + 1]) ||
      (ly === 0 || !mask[(ly - 1) * w + lx]) ||
      (ly === h - 1 || !mask[(ly + 1) * w + lx])

    if (isBorder) {
      // Fix 3 — feathering : 50% luminaire + 50% fond original
      output[bi]     = (d[li]     + origData[bi])     >> 1
      output[bi + 1] = (d[li + 1] + origData[bi + 1]) >> 1
      output[bi + 2] = (d[li + 2] + origData[bi + 2]) >> 1
      output[bi + 3] = 180
    } else {
      output[bi]     = d[li]
      output[bi + 1] = d[li + 1]
      output[bi + 2] = d[li + 2]
      output[bi + 3] = 255
    }
  }
}

// ─── Fix 2 — helper : dessiner un ImageData sur un canvas DPR-scalé ──────────────

function putImageDataDPR(
  canvas: HTMLCanvasElement,
  data: Uint8ClampedArray,
  W: number,
  H: number,
  transparent: boolean
): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width  = W * dpr
  canvas.height = H * dpr

  // Intermédiaire CSS-resolution pour putImageData (ignore la transform)
  const tmp = document.createElement("canvas")
  tmp.width = W; tmp.height = H
  tmp.getContext("2d")!.putImageData(new ImageData(data, W, H), 0, 0)

  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  if (transparent) ctx.clearRect(0, 0, W * dpr, H * dpr)
  ctx.drawImage(tmp, 0, 0, W * dpr, H * dpr)
}

// ─── Museum label tooltip ────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible }: { lum: GalleryLuminaire; visible: boolean }) {
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", minWidth: 150, maxWidth: 200, opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
    >
      <div style={{ background: "linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)", border: "1px solid #b8974a", borderRadius: 2, padding: "8px 10px", boxShadow: "0 2px 10px rgba(0,0,0,.35)", position: "relative" }}>
        <div style={{ position:"absolute",bottom:-7,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"7px solid transparent",borderRight:"7px solid transparent",borderTop:"7px solid #b8974a" }} />
        <div style={{ position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #f0e6c0" }} />
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

  // Fix 1 — deux canvas distincts : fond permanent + composite zones uniquement
  const canvasBaseRef = useRef<HTMLCanvasElement>(null)   // z-index 1, opacity 1, ne change jamais
  const canvasCompRef = useRef<HTMLCanvasElement>(null)   // z-index 2, crossfade uniquement ici

  const origDataRef   = useRef<Uint8ClampedArray | null>(null)  // fond base (vert→beige)
  const zonesRef      = useRef<GreenZone[]>([])
  const imgSizeRef    = useRef({ w: 1330, h: 876 })
  const historyRef    = useRef<GalleryLuminaire[][]>([])
  const currentRef    = useRef<GalleryLuminaire[]>([])
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  const [pool,      setPool]      = useState<GalleryLuminaire[]>([])
  const [current,   setCurrent]   = useState<GalleryLuminaire[]>([])
  const [zones,     setZones]     = useState<GreenZone[]>([])
  const [phase,     setPhase]     = useState<"idle"|"loading"|"detecting"|"compositing"|"ready"|"error">("idle")
  const [alphaBase, setAlphaBase] = useState(0)   // fond : 0 → 1 au chargement, ne bouge plus
  const [alphaComp, setAlphaComp] = useState(0)   // composite : crossfade 0↔1 pour les rotations
  const [hovZone,   setHovZone]   = useState<number | null>(null)
  const [hovering,  setHovering]  = useState(false)
  const [hasPrev,   setHasPrev]   = useState(false)

  // ── Charger le pool ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

  // Fix 1 — doComposite écrit uniquement les zones dans canvasComp (fond transparent)
  const doComposite = useCallback(async (
    sel: GalleryLuminaire[],
    zns: GreenZone[],
    W: number,
    H: number
  ) => {
    if (!canvasCompRef.current || !origDataRef.current) return

    const output = new Uint8ClampedArray(W * H * 4)  // transparent (tout à zéro)

    await Promise.all(
      zns.map((zone, i) =>
        sel[i]
          ? compositeZone(output, zone, sel[i].imageUrl, W, H, origDataRef.current!)
          : Promise.resolve()
      )
    )

    // Fix 2 — rendu DPR via canvas intermédiaire + drawImage avec smoothing
    putImageDataDPR(canvasCompRef.current, output, W, H, true)
  }, [])

  // ── Charger et traiter le tableau de fond ────────────────────────────────────────
  useEffect(() => {
    if (!paintingUrl || !canvasBaseRef.current) return
    let cancelled = false

    ;(async () => {
      try {
        setPhase("loading")
        setAlphaBase(0); setAlphaComp(0)

        const img = await loadImg(paintingUrl)
        if (cancelled) return

        const W = img.naturalWidth, H = img.naturalHeight
        imgSizeRef.current = { w: W, h: H }

        // Dessiner le tableau brut sur un canvas temporaire pour récupérer les pixels
        const tmp = document.createElement("canvas")
        tmp.width = W; tmp.height = H
        const tmpCtx = tmp.getContext("2d")!
        tmpCtx.drawImage(img, 0, 0)
        const imgData = tmpCtx.getImageData(0, 0, W, H)

        setPhase("detecting")
        await sleep(16)
        if (cancelled) return

        const detectedZones = detectGreenZones(imgData.data, W, H)
        console.log(`[PaintingGallery] ${detectedZones.length} zone(s) verte(s)`, detectedZones.map(z => `#${z.id} ${z.bbox.w}×${z.bbox.h}`))
        zonesRef.current = detectedZones
        setZones(detectedZones)
        if (cancelled) return

        // Fix 1 — remplacer les zones vertes par #b8a898 dans le fond de base
        const baseData = new Uint8ClampedArray(imgData.data)
        for (const zone of detectedZones) {
          for (let k = 0; k < zone.pixels.length; k++) {
            const bi = zone.pixels[k] * 4
            baseData[bi] = BASE_R; baseData[bi + 1] = BASE_G
            baseData[bi + 2] = BASE_B; baseData[bi + 3] = 255
          }
        }
        origDataRef.current = baseData

        // Fix 2 — canvasBase DPR-scalé, dessiné une seule fois, opacity permanente
        putImageDataDPR(canvasBaseRef.current!, baseData, W, H, false)
        setAlphaBase(1)   // fond visible dès maintenant, ne change plus

        if (pool.length > 0 && detectedZones.length > 0) {
          setPhase("compositing")
          const sel = pickRandom(pool, detectedZones.length)
          currentRef.current = sel; historyRef.current = [sel]
          setCurrent(sel); setHasPrev(false)
          await doComposite(sel, detectedZones, W, H)
          setAlphaComp(1)
        }

        if (!cancelled) setPhase("ready")
      } catch (e) {
        console.error("PaintingGallery:", e)
        if (!cancelled) setPhase("error")
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintingUrl, doComposite])

  // ── Pool chargé après le tableau ─────────────────────────────────────────────────
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

  // Fix 1 — doRotate : fade uniquement sur canvasComp, canvasBase ne bouge jamais
  const doRotate = useCallback(async (dir: "next" | "prev") => {
    const zns = zonesRef.current
    if (zns.length === 0 || pool.length === 0) return

    setAlphaComp(0)
    await sleep(450)   // attendre la fin du fade-out CSS (0.4s + marge)

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

  // ── Timer 30s ─────────────────────────────────────────────────────────────────────
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

  const { w: iW, h: iH } = imgSizeRef.current

  return (
    <section
      className="relative w-full select-none"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Fix 1 — conteneur overflow-hidden uniquement pour les canvas */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${iW} / ${iH}` }}>

        {/* Fix 1 — canvasBase : fond permanent, opacity 1, ne change jamais */}
        <canvas
          ref={canvasBaseRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:1, opacity:alphaBase, transition:"opacity 0.5s ease" }}
        />

        {/* Fix 1 — canvasComp : zones luminaires uniquement, crossfade ici */}
        <canvas
          ref={canvasCompRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:2, opacity:alphaComp, transition:"opacity 0.4s ease" }}
        />

        {/* Overlay de chargement */}
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

      </div>

      {/* Zones interactives EN DEHORS de overflow-hidden → tooltips non clippés */}
      {phase === "ready" && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
          {zones.map((zone, i) => {
            const lum = current[i]
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
                {lum && <MuseumLabel lum={lum} visible={hovZone === zone.id} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Flèches EN DEHORS de overflow-hidden */}
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
