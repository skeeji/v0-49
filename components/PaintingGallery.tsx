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

// ─── Zones codées en dur (en % de W/H de l'image) ───────────────────────────────
// Chaque zone correspond à un cadre/vitre transparent dans image_RGBA_final.png.
// Format : { id, l(left%), t(top%), w(width%), h(height%) }
// Pour calibrer : appuyer sur D sur la page pour afficher l'overlay de debug.

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
const ALPHA_THRESHOLD   = 128   // pixel considéré transparent si alpha < cette valeur
const BG_R = 245, BG_G = 240, BG_B = 232   // #f5f0e8 — beige de fond

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

// ─── Compositing d'un luminaire dans une zone (niveau pixel) ─────────────────────
//
// Même architecture que la version fond-vert de v18-good :
//  - charge le luminaire dans un canvas off-screen
//  - boucle pixel pour supprimer le fond blanc → beige
//  - copie uniquement les pixels TRANSPARENTS de la zone (alpha < ALPHA_THRESHOLD)
//    du tableau RGBA original → remplace dans `base`
//
// Résultat : base[zone transparente] = pixels luminaire, le reste = tableau + beige.

async function compositeZone(
  base:     Uint8ClampedArray,   // buffer de sortie modifié en place
  origData: Uint8ClampedArray,   // données RGBA brutes du tableau (pour tester l'alpha)
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

  // Canvas off-screen : fond beige + luminaire en object-fit:contain avec 10 % de marge
  const oc = document.createElement("canvas")
  oc.width = bw; oc.height = bh
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

  // ── Suppression du fond blanc (identique à v18-good) ─────────────────────────
  for (let i = 0; i < lumD.length; i += 4) {
    const r = lumD[i], g = lumD[i + 1], b = lumD[i + 2]
    if (r > 220 && g > 220 && b > 220) {
      lumD[i] = BG_R; lumD[i + 1] = BG_G; lumD[i + 2] = BG_B
    } else {
      const minCh = Math.min(r, g, b)
      if (minCh > 180) {
        const t = (minCh - 180) / 40   // 0 (à 180) → 1 (à 220)
        lumD[i]     = Math.round(r + (BG_R - r) * t)
        lumD[i + 1] = Math.round(g + (BG_G - g) * t)
        lumD[i + 2] = Math.round(b + (BG_B - b) * t)
      }
    }
  }

  // ── Copie dans base uniquement pour les pixels TRANSPARENTS du tableau ───────
  // (équivalent de zone.pixels dans v18-good, mais testé via le canal alpha)
  for (let row = 0; row < bh; row++) {
    for (let col = 0; col < bw; col++) {
      const px = bx + col
      const py = by + row
      if (px < 0 || px >= W || py < 0) continue

      const origIdx  = (py * W + px) * 4
      const origAlpha = origData[origIdx + 3]

      if (origAlpha < ALPHA_THRESHOLD) {
        // Pixel transparent dans le tableau → c'est un cadre → afficher le luminaire
        const lumIdx = (row * bw + col) * 4
        base[origIdx]     = lumD[lumIdx]
        base[origIdx + 1] = lumD[lumIdx + 1]
        base[origIdx + 2] = lumD[lumIdx + 2]
        base[origIdx + 3] = 255
      }
    }
  }
}

// ─── Museum label ────────────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: { lum: GalleryLuminaire; visible: boolean; below: boolean }) {
  const pos  = below ? { top:"calc(100% + 6px)", bottom:"auto" } : { bottom:"calc(100% + 6px)", top:"auto" }
  const aOut = below
    ? { top:-7,  bottom:"auto", borderBottom:"7px solid #b8974a", borderTop:"none" }
    : { bottom:-7, top:"auto", borderTop:"7px solid #b8974a",   borderBottom:"none" }
  const aIn  = below
    ? { top:-5,  bottom:"auto", borderBottom:"6px solid #f0e6c0", borderTop:"none" }
    : { bottom:-5, top:"auto", borderTop:"6px solid #f0e6c0",   borderBottom:"none" }
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

  // ── Deux canvas pour le crossfade (même architecture v18-good) ────────────────
  const canvasARef   = useRef<HTMLCanvasElement>(null)
  const canvasBRef   = useRef<HTMLCanvasElement>(null)
  const activeRef    = useRef<"A"|"B">("A")

  // ── Données lourdes en refs (pas de re-render inutile) ────────────────────────
  const origDataRef  = useRef<Uint8ClampedArray | null>(null)  // données alpha brutes
  const paintingRef  = useRef<HTMLImageElement | null>(null)   // image chargée
  const imgSizeRef   = useRef({ w: 1330, h: 876 })
  const zonesRef     = useRef<FrameZone[]>([])
  const historyRef   = useRef<GalleryLuminaire[][]>([])
  const currentRef   = useRef<GalleryLuminaire[]>([])
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── État UI ───────────────────────────────────────────────────────────────────
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

  // ── Pool ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

  // ── doComposite — même architecture que v18-good ─────────────────────────────
  //
  //  1. Canvas temp : fond beige + tableau RGBA par-dessus (source-over)
  //     → les zones transparentes du tableau restent beige
  //  2. getImageData → buffer `base` (RGBA plat, tout opaque)
  //  3. compositeZone pour chaque zone : écrit les pixels luminaire uniquement
  //     là où origData.alpha < ALPHA_THRESHOLD (les cadres transparents)
  //  4. putImageData → canvas cible
  //
  const doComposite = useCallback(async (
    sel:    GalleryLuminaire[],
    zones:  FrameZone[],
    W:      number,
    H:      number,
    target: HTMLCanvasElement,
  ) => {
    if (!origDataRef.current || !paintingRef.current) return

    // 1. Fond beige + tableau blendé par-dessus
    const tmp = document.createElement("canvas")
    tmp.width = W; tmp.height = H
    const tmpCtx = tmp.getContext("2d")!
    tmpCtx.fillStyle = `rgb(${BG_R},${BG_G},${BG_B})`
    tmpCtx.fillRect(0, 0, W, H)
    tmpCtx.drawImage(paintingRef.current, 0, 0, W, H)

    // 2. Récupérer le buffer pixel (entièrement opaque : beige là où transparent)
    const imgData = tmpCtx.getImageData(0, 0, W, H)
    const base    = imgData.data

    // 3. Insérer les luminaires dans les zones transparentes (niveau pixel)
    await Promise.all(
      zones.map((zone, i) =>
        sel[i]
          ? compositeZone(base, origDataRef.current!, zone.bbox, sel[i].imageUrl, W)
          : Promise.resolve()
      )
    )

    // 4. Afficher le résultat
    target.width  = W
    target.height = H
    target.getContext("2d")!.putImageData(imgData, 0, 0)
  }, [])

  // ── Crossfade A↔B (identique v18-good) ───────────────────────────────────────
  const crossfadeTo = useCallback(async (
    sel:  GalleryLuminaire[],
    zns:  FrameZone[],
    W:    number,
    H:    number,
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

  // ── Chargement du tableau + extraction des données alpha ─────────────────────
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

        // Extraire les données alpha brutes (pour tester origData[pi*4+3] dans compositeZone)
        const tmp = document.createElement("canvas")
        tmp.width = W; tmp.height = H
        tmp.getContext("2d")!.drawImage(img, 0, 0)
        origDataRef.current = new Uint8ClampedArray(tmp.getContext("2d")!.getImageData(0, 0, W, H).data)

        // Construire les zones depuis les pourcentages
        const zns = buildZones(W, H)
        zonesRef.current = zns
        setZones(zns)
        console.log(`[PaintingGallery] ${zns.length} zones construites (${W}×${H})`)

        setPaintingReady(true)
      } catch {
        if (!cancelled) setPhase("error")
      }
    })()

    return () => { cancelled = true }
  }, [transparentUrl])

  // ── Première composition dès que tableau + pool sont prêts ───────────────────
  useEffect(() => {
    if (!paintingReady || pool.length === 0 || currentRef.current.length > 0) return
    ;(async () => {
      const zns = zonesRef.current
      const { w: W, h: H } = imgSizeRef.current
      const sel = pickRandom(pool, zns.length)
      currentRef.current = sel
      historyRef.current = [sel]
      setCurrent(sel)
      setHasPrev(false)

      setPhase("compositing")
      await doComposite(sel, zns, W, H, canvasARef.current!)
      activeRef.current = "A"
      setAlphaA(1); setAlphaB(0)
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
    currentRef.current = sel
    setCurrent(sel)

    await crossfadeTo(sel, zns, W, H)
  }, [pool, crossfadeTo])

  // ── Timer 30 s ────────────────────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => doRotate("next"), ROTATION_INTERVAL)
  }, [doRotate])

  useEffect(() => {
    if (phase !== "ready" || pool.length === 0) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, pool.length, resetTimer])

  // ── Touche D → overlay de calibration ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") setDebugZones(v => !v)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
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
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${iW} / ${iH}`, background:`rgb(${BG_R},${BG_G},${BG_B})` }}>

        {/* Canvas A */}
        <canvas ref={canvasARef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:1, opacity:alphaA, transition:"opacity 0.6s ease" }}
        />
        {/* Canvas B */}
        <canvas ref={canvasBRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:1, opacity:alphaB, transition:"opacity 0.6s ease" }}
        />

        {/* Overlay de calibration — touche D */}
        {debugZones && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex:30 }}>
            {zones.map(zone => (
              <div key={zone.id}
                style={{
                  position:       "absolute",
                  left:           `${(zone.bbox.x / iW) * 100}%`,
                  top:            `${(zone.bbox.y / iH) * 100}%`,
                  width:          `${(zone.bbox.w / iW) * 100}%`,
                  height:         `${(zone.bbox.h / iH) * 100}%`,
                  border:         "2px solid rgba(255,80,80,0.9)",
                  background:     "rgba(255,0,0,0.15)",
                  boxSizing:      "border-box",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color:"#fff", fontSize:10, fontWeight:700, textShadow:"0 0 3px #000" }}>{zone.id}</span>
              </div>
            ))}
            <div style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,.7)", color:"#fff", fontSize:11, padding:"4px 10px", borderRadius:4, whiteSpace:"nowrap" }}>
              DEBUG — {zones.length} zones — appuie D pour fermer
            </div>
          </div>
        )}

        {(phase === "loading" || phase === "compositing") && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background:"rgba(245,241,232,0.75)" }}>
            <p className="font-serif text-sm italic text-stone-600">
              {phase === "loading" ? "Chargement du tableau…" : "Placement des luminaires…"}
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
