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

interface BBox { x: number; y: number; w: number; h: number }

interface GreenZone {
  id: number
  bbox: BBox
  pixels: Uint32Array   // indices dans l'ImageData globale (y*W + x)
}

// ─── Constantes ─────────────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 30_000
const MIN_ZONE_PIXELS   = 400
const MERGE_GAP         = 60    // px — zones plus proches que ça sont fusionnées
const DILATE_RADIUS     = 2     // px — dilatation du masque pour couvrir l'antialiasing

// ─── Helpers ────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/** Détection chroma key : vert vif */
function isGreenPx(r: number, g: number, b: number): boolean {
  return g > 80 && g > r * 1.3 && g > b * 1.3
}

function pickRandom(pool: GalleryLuminaire[], n: number): GalleryLuminaire[] {
  const copy = [...pool]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.min(n, copy.length))
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error(`Cannot load: ${src}`))
    img.src     = src
  })
}

// ─── Détection BFS + dilatation + fusion ────────────────────────────────────────

function detectGreenZones(data: Uint8ClampedArray, W: number, H: number): GreenZone[] {
  const visited = new Uint8Array(W * H)
  const dilMask = new Uint8Array(W * H)   // réutilisé par zone
  const zones: GreenZone[] = []

  // ── 1. BFS pour chaque composante connexe verte ──────────────────────────────
  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const si = sy * W + sx
      if (visited[si]) continue
      const r = data[si*4], g = data[si*4+1], b = data[si*4+2]
      if (!isGreenPx(r, g, b)) continue

      const pixels: number[] = []
      const q: number[] = [si]
      visited[si] = 1
      let qi = 0

      while (qi < q.length) {
        const ci = q[qi++]
        pixels.push(ci)
        const cy = (ci / W) | 0, cx = ci % W
        if (cx > 0)     { const n=ci-1; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
        if (cx < W - 1) { const n=ci+1; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
        if (cy > 0)     { const n=ci-W; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
        if (cy < H - 1) { const n=ci+W; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
      }

      if (pixels.length < MIN_ZONE_PIXELS) continue

      // Bounding box initiale
      let x0 = W, x1 = 0, y0 = H, y1 = 0
      for (const i of pixels) {
        const py = (i/W)|0, px = i%W
        if (px<x0) x0=px; if (px>x1) x1=px
        if (py<y0) y0=py; if (py>y1) y1=py
      }

      // ── 2. Dilatation de 2px (masque des pixels de bordure antialiasés) ──────
      dilMask.fill(0)   // reset pour cette zone
      for (const i of pixels) dilMask[i] = 1

      const toAdd: number[] = []
      for (const pi of pixels) {
        const py = (pi/W)|0, px = pi%W
        for (let dy = -DILATE_RADIUS; dy <= DILATE_RADIUS; dy++) {
          for (let dx = -DILATE_RADIUS; dx <= DILATE_RADIUS; dx++) {
            if (dx*dx + dy*dy > DILATE_RADIUS*DILATE_RADIUS) continue
            const nx = px+dx, ny = py+dy
            if (nx<0||nx>=W||ny<0||ny>=H) continue
            const ni = ny*W+nx
            if (!dilMask[ni]) { dilMask[ni]=1; toAdd.push(ni) }
          }
        }
      }

      const allPx = new Uint32Array(pixels.length + toAdd.length)
      allPx.set(pixels)
      for (let k=0; k<toAdd.length; k++) allPx[pixels.length+k] = toAdd[k]

      zones.push({
        id: zones.length,
        bbox: {
          x: Math.max(0, x0 - DILATE_RADIUS),
          y: Math.max(0, y0 - DILATE_RADIUS),
          w: Math.min(W, x1 + DILATE_RADIUS + 1) - Math.max(0, x0 - DILATE_RADIUS),
          h: Math.min(H, y1 + DILATE_RADIUS + 1) - Math.max(0, y0 - DILATE_RADIUS),
        },
        pixels: allPx,
      })
    }
  }

  // ── 3. Fusion spatiale : zones dont les bboxes sont à < MERGE_GAP px ─────────
  function bboxGap(a: BBox, b: BBox) {
    const xGap = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x+a.w, b.x+b.w))
    const yGap = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y+a.h, b.y+b.h))
    return { xGap, yGap }
  }

  function mergeTwo(a: GreenZone, b: GreenZone): GreenZone {
    const x0 = Math.min(a.bbox.x, b.bbox.x)
    const y0 = Math.min(a.bbox.y, b.bbox.y)
    const x1 = Math.max(a.bbox.x+a.bbox.w, b.bbox.x+b.bbox.w)
    const y1 = Math.max(a.bbox.y+a.bbox.h, b.bbox.y+b.bbox.h)
    const combined = new Uint32Array(a.pixels.length + b.pixels.length)
    combined.set(a.pixels); combined.set(b.pixels, a.pixels.length)
    return { id: a.id, bbox: { x:x0, y:y0, w:x1-x0, h:y1-y0 }, pixels: combined }
  }

  let result = [...zones]
  let changed = true
  while (changed) {
    changed = false
    const next: GreenZone[] = []
    const used = new Uint8Array(result.length)
    for (let i = 0; i < result.length; i++) {
      if (used[i]) continue
      let cur = result[i]
      for (let j = i+1; j < result.length; j++) {
        if (used[j]) continue
        const { xGap, yGap } = bboxGap(cur.bbox, result[j].bbox)
        if (xGap <= MERGE_GAP && yGap <= MERGE_GAP) {
          cur = mergeTwo(cur, result[j])
          used[j] = 1
          changed = true
        }
      }
      next.push(cur)
      used[i] = 1
    }
    result = next
  }

  // Renuméroter et trier haut→bas, gauche→droite
  return result
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
    .map((z, i) => ({ ...z, id: i }))
}

// ─── Composite un luminaire dans un ImageData pour une zone ─────────────────────

async function compositeZone(
  base: Uint8ClampedArray,
  zone: GreenZone,
  lumUrl: string,
  W: number
): Promise<void> {
  const { x, y, w, h } = zone.bbox
  let img: HTMLImageElement
  try { img = await loadImg(lumUrl) } catch { return }

  const oc = document.createElement("canvas")
  oc.width = w; oc.height = h
  const ctx = oc.getContext("2d")!
  // Étirement direct — l'image remplit exactement le bounding box
  ctx.drawImage(img, 0, 0, w, h)
  const lumD = ctx.getImageData(0, 0, w, h).data

  for (let zi = 0; zi < zone.pixels.length; zi++) {
    const pi = zone.pixels[zi]
    const px = pi % W, py = (pi / W) | 0
    const li = ((py - y) * w + (px - x)) * 4
    if (li < 0 || li >= lumD.length) continue
    const bi = pi * 4
    base[bi]   = lumD[li]
    base[bi+1] = lumD[li+1]
    base[bi+2] = lumD[li+2]
    base[bi+3] = 255
  }
}

// ─── Tooltip étiquette musée ─────────────────────────────────────────────────────

function MuseumLabel({ lum, visible }: { lum: GalleryLuminaire; visible: boolean }) {
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ bottom:"calc(100% + 6px)", left:"50%", transform:"translateX(-50%)", minWidth:150, maxWidth:200, opacity:visible?1:0, transition:"opacity 0.2s ease" }}
    >
      <div style={{ background:"linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)", border:"1px solid #b8974a", borderRadius:2, padding:"8px 10px", boxShadow:"0 2px 10px rgba(0,0,0,.35)", position:"relative" }}>
        <div style={{ position:"absolute",bottom:-7,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"7px solid transparent",borderRight:"7px solid transparent",borderTop:"7px solid #b8974a" }} />
        <div style={{ position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #f0e6c0" }} />
        <p style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:11,fontWeight:600,color:"#3d2b0a",lineHeight:1.3 }}>{lum.nom}</p>
        {lum.designer && <p style={{ fontFamily:"Georgia,serif",fontSize:10,fontStyle:"italic",color:"#6b4f1a",marginTop:2 }}>{lum.designer}</p>}
        {lum.annee    && <p style={{ fontFamily:"Georgia,serif",fontSize:9,color:"#7a5c20",marginTop:1 }}>{lum.annee}</p>}
        <Link href={`/luminaires/${lum._id}`} target="_blank" rel="noopener noreferrer" className="pointer-events-auto block mt-1" style={{ fontFamily:"Georgia,serif",fontSize:9,color:"#5a3a10",textDecoration:"underline" }}>
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────────

export function PaintingGallery({ paintingUrl }: { paintingUrl?: string }) {

  // ── Deux canvas pour le crossfade sans effacer le fond ──────────────────────────
  const canvasARef   = useRef<HTMLCanvasElement>(null)
  const canvasBRef   = useRef<HTMLCanvasElement>(null)
  const activeRef    = useRef<"A" | "B">("A")   // canvas actuellement visible

  // ── Données lourdes en refs (pas de re-render) ───────────────────────────────────
  const origDataRef  = useRef<Uint8ClampedArray | null>(null)
  const zonesRef     = useRef<GreenZone[]>([])
  const imgSizeRef   = useRef({ w: 1330, h: 876 })
  const historyRef   = useRef<GalleryLuminaire[][]>([])
  const currentRef   = useRef<GalleryLuminaire[]>([])
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── État UI ───────────────────────────────────────────────────────────────────────
  const [pool,     setPool]     = useState<GalleryLuminaire[]>([])
  const [current,  setCurrent]  = useState<GalleryLuminaire[]>([])
  const [zones,    setZones]    = useState<GreenZone[]>([])
  const [phase,    setPhase]    = useState<"idle"|"loading"|"detecting"|"compositing"|"ready"|"error">("idle")
  const [alphaA,   setAlphaA]   = useState(0)
  const [alphaB,   setAlphaB]   = useState(0)
  const [hovZone,  setHovZone]  = useState<number | null>(null)
  const [hovering, setHovering] = useState(false)
  const [hasPrev,  setHasPrev]  = useState(false)

  // ── Charger le pool ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

  // ── Composite sur un canvas cible ─────────────────────────────────────────────────
  const doComposite = useCallback(async (
    sel:    GalleryLuminaire[],
    zns:    GreenZone[],
    W:      number,
    H:      number,
    target: HTMLCanvasElement
  ) => {
    if (!origDataRef.current) return
    const base = new Uint8ClampedArray(origDataRef.current)

    await Promise.all(
      zns.map((zone, i) =>
        sel[i] ? compositeZone(base, zone, sel[i].imageUrl, W) : Promise.resolve()
      )
    )

    target.width  = W
    target.height = H
    const ctx = target.getContext("2d")
    if (ctx) ctx.putImageData(new ImageData(base, W, H), 0, 0)
  }, [])

  // ── Crossfade sans effacer le tableau ────────────────────────────────────────────
  // Composite sur le canvas INACTIF, puis crossfade vers lui
  const crossfadeTo = useCallback(async (
    sel: GalleryLuminaire[],
    zns: GreenZone[],
    W: number,
    H: number
  ) => {
    const inactive = activeRef.current === "A" ? "B" : "A"
    const targetCanvas = inactive === "A" ? canvasARef.current : canvasBRef.current
    if (!targetCanvas) return

    // Composer silencieusement sur le canvas inactif
    await doComposite(sel, zns, W, H, targetCanvas)

    // Crossfade : l'inactif monte à 1, l'actif descend à 0
    if (inactive === "A") { setAlphaA(1); setAlphaB(0) }
    else                  { setAlphaA(0); setAlphaB(1) }

    // Attendre la fin de la transition CSS
    await sleep(600)
    activeRef.current = inactive
  }, [doComposite])

  // ── Charger et analyser le tableau de fond ────────────────────────────────────────
  useEffect(() => {
    if (!paintingUrl || !canvasARef.current) return
    let cancelled = false

    ;(async () => {
      try {
        setPhase("loading")
        setAlphaA(0); setAlphaB(0)

        const img = await loadImg(paintingUrl)
        if (cancelled) return

        const W = img.naturalWidth, H = img.naturalHeight
        imgSizeRef.current = { w: W, h: H }

        // Dessiner sur les deux canvas (pour qu'ils aient la bonne taille dès le départ)
        for (const ref of [canvasARef, canvasBRef]) {
          if (!ref.current) continue
          ref.current.width  = W
          ref.current.height = H
          ref.current.getContext("2d")!.drawImage(img, 0, 0)
        }

        // Sauvegarder les données originales
        const ctx = canvasARef.current!.getContext("2d")!
        const imgData = ctx.getImageData(0, 0, W, H)
        origDataRef.current = new Uint8ClampedArray(imgData.data)

        setPhase("detecting")
        await sleep(16)
        if (cancelled) return

        const detectedZones = detectGreenZones(imgData.data, W, H)
        zonesRef.current = detectedZones
        setZones(detectedZones)
        if (cancelled) return

        if (pool.length > 0 && detectedZones.length > 0) {
          setPhase("compositing")
          const sel = pickRandom(pool, detectedZones.length)
          currentRef.current = sel; historyRef.current = [sel]
          setCurrent(sel); setHasPrev(false)
          // Composite sur canvasA (actif), puis fade in
          await doComposite(sel, detectedZones, W, H, canvasARef.current!)
          activeRef.current = "A"
          setAlphaA(1); setAlphaB(0)
        } else {
          // Pas encore de pool — afficher le tableau brut sur canvasA
          activeRef.current = "A"
          setAlphaA(1); setAlphaB(0)
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

  // ── Pool reçu après le tableau ────────────────────────────────────────────────────
  useEffect(() => {
    if (pool.length === 0 || zonesRef.current.length === 0 || currentRef.current.length > 0) return
    ;(async () => {
      const { w: W, h: H } = imgSizeRef.current
      const sel = pickRandom(pool, zonesRef.current.length)
      currentRef.current = sel; historyRef.current = [sel]
      setCurrent(sel); setHasPrev(false)
      setPhase("compositing")
      const active = activeRef.current === "A" ? canvasARef.current : canvasBRef.current
      if (active) await doComposite(sel, zonesRef.current, W, H, active)
      setPhase("ready")
    })()
  }, [pool, doComposite])

  // ── Rotation ──────────────────────────────────────────────────────────────────────
  const doRotate = useCallback(async (dir: "next" | "prev") => {
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

    const { w: W, h: H } = imgSizeRef.current
    await crossfadeTo(sel, zns, W, H)
  }, [pool, crossfadeTo])

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
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${iW} / ${iH}`, background: "#111" }}>

        {/* Canvas A */}
        <canvas
          ref={canvasARef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", opacity:alphaA, transition:"opacity 0.6s ease" }}
        />

        {/* Canvas B (crossfade target) */}
        <canvas
          ref={canvasBRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", opacity:alphaB, transition:"opacity 0.6s ease" }}
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

        {/* Zones interactives transparentes */}
        {phase === "ready" && zones.map((zone, i) => {
          const lum = current[i]
          return (
            <div
              key={zone.id}
              className="absolute cursor-pointer"
              style={{ left:`${(zone.bbox.x/iW)*100}%`, top:`${(zone.bbox.y/iH)*100}%`, width:`${(zone.bbox.w/iW)*100}%`, height:`${(zone.bbox.h/iH)*100}%`, zIndex:5 }}
              onMouseEnter={() => setHovZone(zone.id)}
              onMouseLeave={() => setHovZone(null)}
            >
              {lum && <MuseumLabel lum={lum} visible={hovZone === zone.id} />}
            </div>
          )
        })}

        {/* Flèche gauche */}
        <button onClick={() => { resetTimer(); doRotate("prev") }} disabled={!hasPrev} aria-label="Précédent"
          style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",zIndex:10,width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,.28)",border:"none",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",backdropFilter:"blur(4px)",opacity:hovering?(hasPrev?1:0.2):0,transition:"opacity .3s ease" }}>
          <ChevronLeft size={20} />
        </button>

        {/* Flèche droite */}
        <button onClick={() => { resetTimer(); doRotate("next") }} aria-label="Suivant"
          style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",zIndex:10,width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,.28)",border:"none",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",backdropFilter:"blur(4px)",opacity:hovering?1:0,transition:"opacity .3s ease" }}>
          <ChevronRight size={20} />
        </button>

      </div>
    </section>
  )
}
