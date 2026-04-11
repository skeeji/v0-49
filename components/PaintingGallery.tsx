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

// ─── Zones codées en dur (en % de W/H) ──────────────────────────────────────────
// Basées sur l'analyse de image_RGBA_final.png (Image #6).
// Format : { id, l(left%), t(top%), w(width%), h(height%) }
// Pour ajuster : modifier ces valeurs en %, elles s'adaptent à toute taille d'image.

const ZONES_PCT = [
  // ── Fenêtres gauche (2 colonnes × 3 rangées) ──────────────────────────────
  { id:  0, l:  1.5, t: 10.0, w:  7.0, h: 12.0 },   // fenêtre col1 rang1
  { id:  1, l:  1.5, t: 24.0, w:  7.0, h: 12.0 },   // fenêtre col1 rang2
  { id:  2, l:  1.5, t: 38.0, w:  7.0, h: 12.0 },   // fenêtre col1 rang3
  { id:  3, l:  9.5, t: 10.0, w:  7.0, h: 12.0 },   // fenêtre col2 rang1
  { id:  4, l:  9.5, t: 24.0, w:  7.0, h: 12.0 },   // fenêtre col2 rang2
  { id:  5, l:  9.5, t: 38.0, w:  7.0, h: 12.0 },   // fenêtre col2 rang3

  // ── Panneaux mur gauche ────────────────────────────────────────────────────
  { id:  6, l: 20.5, t: 14.0, w:  7.0, h: 14.0 },   // panneau gauche haut
  { id:  7, l: 20.5, t: 32.0, w:  7.0, h: 14.0 },   // panneau gauche bas

  // ── Miroir ovale bas-gauche ────────────────────────────────────────────────
  { id:  8, l: 21.0, t: 54.0, w: 10.0, h: 24.0 },   // miroir ovale

  // ── Cadres centre-gauche ──────────────────────────────────────────────────
  { id:  9, l: 29.5, t: 13.0, w:  8.0, h: 18.0 },   // cadre centre-gauche 1
  { id: 10, l: 29.5, t: 36.0, w:  8.0, h: 14.0 },   // cadre centre-gauche 2
  { id: 11, l: 38.0, t: 18.0, w:  6.0, h: 14.0 },   // cadre centre-gauche 3

  // ── Cadre au-dessus de la porte ───────────────────────────────────────────
  { id: 12, l: 44.5, t:  9.0, w: 11.0, h: 14.0 },   // cadre porte

  // ── Grand ovale droite-centre ─────────────────────────────────────────────
  { id: 13, l: 57.5, t: 24.0, w: 14.0, h: 30.0 },   // grand ovale

  // ── Mur droit — rangée supérieure ─────────────────────────────────────────
  { id: 14, l: 61.0, t:  2.0, w:  8.0, h: 12.0 },   // mur D rang1 col1
  { id: 15, l: 69.5, t:  2.0, w:  8.0, h: 12.0 },   // mur D rang1 col2
  { id: 16, l: 78.0, t:  2.0, w:  8.0, h: 12.0 },   // mur D rang1 col3
  { id: 17, l: 86.5, t:  2.0, w:  9.5, h: 12.0 },   // mur D rang1 col4

  // ── Mur droit — 2e rangée ─────────────────────────────────────────────────
  { id: 18, l: 61.0, t: 16.0, w:  8.0, h: 19.0 },   // mur D rang2 col1
  { id: 19, l: 69.5, t: 16.0, w:  8.0, h: 19.0 },   // mur D rang2 col2
  { id: 20, l: 78.0, t: 16.0, w:  8.0, h: 19.0 },   // mur D rang2 col3
  { id: 21, l: 86.5, t: 16.0, w:  9.5, h: 19.0 },   // mur D rang2 col4

  // ── Mur droit — 3e rangée ─────────────────────────────────────────────────
  { id: 22, l: 61.0, t: 38.0, w:  8.0, h: 19.0 },   // mur D rang3 col1
  { id: 23, l: 69.5, t: 38.0, w:  8.0, h: 19.0 },   // mur D rang3 col2
  { id: 24, l: 78.0, t: 38.0, w:  8.0, h: 19.0 },   // mur D rang3 col3
  { id: 25, l: 86.5, t: 38.0, w:  9.5, h: 19.0 },   // mur D rang3 col4

  // ── Mur droit — rangée basse ──────────────────────────────────────────────
  { id: 26, l: 61.0, t: 60.0, w:  8.0, h: 19.0 },   // mur D rang4 col1
  { id: 27, l: 69.5, t: 60.0, w:  8.0, h: 19.0 },   // mur D rang4 col2
  { id: 28, l: 78.0, t: 60.0, w:  8.0, h: 19.0 },   // mur D rang4 col3
  { id: 29, l: 86.5, t: 60.0, w:  9.5, h: 19.0 },   // mur D rang4 col4
]

/** Convertit les zones en pourcentages vers des pixels pour l'image donnée. */
function buildZones(W: number, H: number): FrameZone[] {
  return ZONES_PCT.map(z => ({
    id:   z.id,
    bbox: {
      x: Math.round(z.l / 100 * W),
      y: Math.round(z.t / 100 * H),
      w: Math.round(z.w / 100 * W),
      h: Math.round(z.h / 100 * H),
    },
  }))
}

// ─── Constantes ─────────────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 30_000

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

// ─── Rendu canvas ────────────────────────────────────────────────────────────────
//
//  1. Fond beige sur le canvas principal
//  2. Chaque luminaire dessiné dans sa zone (canvas off-screen + multiply → blanc devient beige, GPU)
//  3. Tableau RGBA par-dessus : pixels opaques = peinture, transparents = luminaire visible
//

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

  // 2. Luminaires en parallèle (un par zone)
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

      // Canvas off-screen : fond beige + multiply → les blancs de l'image deviennent beiges (GPU, zéro boucle pixel)
      const oc     = document.createElement("canvas")
      oc.width     = zw
      oc.height    = zh
      const oc_ctx = oc.getContext("2d")!
      oc_ctx.imageSmoothingEnabled = true
      oc_ctx.imageSmoothingQuality = "high"

      oc_ctx.fillStyle = "#f5f0e8"
      oc_ctx.fillRect(0, 0, zw, zh)
      oc_ctx.globalCompositeOperation = "multiply"

      // object-fit : contain + 10 % de marge intérieure
      const pad    = 0.10
      const availW = zw * (1 - 2 * pad)
      const availH = zh * (1 - 2 * pad)
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

  // 3. Tableau RGBA par-dessus (pixels opaques masquent les luminaires)
  ctx.drawImage(painting, 0, 0, W, H)
}

// ─── Museum label ────────────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: { lum: GalleryLuminaire; visible: boolean; below: boolean }) {
  const pos  = below ? { top:"calc(100% + 6px)", bottom:"auto" } : { bottom:"calc(100% + 6px)", top:"auto" }
  const aOut = below
    ? { top:-7, bottom:"auto", borderBottom:"7px solid #b8974a", borderTop:"none" }
    : { bottom:-7, top:"auto", borderTop:"7px solid #b8974a", borderBottom:"none" }
  const aIn  = below
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

  const canvasARef  = useRef<HTMLCanvasElement>(null)
  const canvasBRef  = useRef<HTMLCanvasElement>(null)
  const activeRef   = useRef<"A"|"B">("A")
  const paintingRef = useRef<HTMLImageElement | null>(null)
  const imgSizeRef  = useRef({ w: 1330, h: 876 })
  const zonesRef    = useRef<FrameZone[]>([])

  const [pool,          setPool]          = useState<GalleryLuminaire[]>([])
  const [current,       setCurrent]       = useState<GalleryLuminaire[]>([])
  const [zones,         setZones]         = useState<FrameZone[]>([])
  const [paintingReady, setPaintingReady] = useState(false)
  const [imgSize,       setImgSize]       = useState({ w: 1330, h: 876 })
  const [phase,         setPhase]         = useState<"loading"|"compositing"|"ready"|"error">("loading")
  const [alphaA,        setAlphaA]        = useState(0)
  const [alphaB,        setAlphaB]        = useState(0)
  const [hovZone,       setHovZone]       = useState<number | null>(null)
  const [hovering,      setHovering]      = useState(false)
  const [hasPrev,       setHasPrev]       = useState(false)
  const [debugZones,    setDebugZones]    = useState(false)

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

  // ── Chargement du tableau → calcul des zones codées en dur ───────────────────────
  useEffect(() => {
    if (!transparentUrl) return
    let cancelled = false
    setPhase("loading")
    setPaintingReady(false)

    loadImg(transparentUrl)
      .then(img => {
        if (cancelled) return
        const W = img.naturalWidth  || 1330
        const H = img.naturalHeight || 876
        paintingRef.current = img
        imgSizeRef.current  = { w: W, h: H }
        setImgSize({ w: W, h: H })

        const zns = buildZones(W, H)
        zonesRef.current = zns
        setZones(zns)

        console.log(`[PaintingGallery] ${zns.length} zones chargées (${W}×${H})`,
          zns.map(z => `#${z.id} x=${z.bbox.x} y=${z.bbox.y} ${z.bbox.w}×${z.bbox.h}`))

        setPaintingReady(true)   // déclenche la composition via useEffect
      })
      .catch(() => { if (!cancelled) setPhase("error") })

    return () => { cancelled = true }
  }, [transparentUrl])

  // ── Première composition dès que tableau + pool sont prêts ───────────────────────
  useEffect(() => {
    if (!paintingReady || pool.length === 0 || currentRef.current.length > 0) return
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

  // ── Touche D → basculer l'affichage des zones (calibration) ─────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") setDebugZones(v => !v)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

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

        {/* Tableau affiché immédiatement (fallback pendant le chargement canvas) */}
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

        {/* Overlay de calibration (touche D) */}
        {debugZones && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex:30 }}>
            {zones.map(zone => (
              <div key={zone.id}
                style={{
                  position:  "absolute",
                  left:      `${(zone.bbox.x / iW) * 100}%`,
                  top:       `${(zone.bbox.y / iH) * 100}%`,
                  width:     `${(zone.bbox.w / iW) * 100}%`,
                  height:    `${(zone.bbox.h / iH) * 100}%`,
                  border:    "2px solid rgba(255,80,80,0.9)",
                  background:"rgba(255,0,0,0.15)",
                  boxSizing: "border-box",
                  display:   "flex",
                  alignItems:"center",
                  justifyContent:"center",
                }}
              >
                <span style={{ color:"#fff", fontSize:10, fontWeight:700, textShadow:"0 0 3px #000", lineHeight:1 }}>
                  {zone.id}
                </span>
              </div>
            ))}
            <div style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,.7)", color:"#fff", fontSize:11, padding:"4px 10px", borderRadius:4, whiteSpace:"nowrap" }}>
              DEBUG ZONES — {zones.length} zones — appuie D pour fermer
            </div>
          </div>
        )}

        {(phase === "loading" || phase === "compositing") && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background:"rgba(245,241,232,0.70)" }}>
            <p className="font-serif text-sm italic text-stone-500">
              {phase === "loading"     ? "Chargement du tableau…" : "Placement des luminaires…"}
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-100">
            <p className="font-serif text-sm italic text-red-400">Erreur de chargement du tableau</p>
          </div>
        )}

      </div>

      {/* Zones interactives — hors overflow-hidden pour que les tooltips débordent */}
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
