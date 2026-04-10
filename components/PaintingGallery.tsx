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

interface Zone { id: number; label: string; left: number; top: number; w: number; h: number }

// ─── Zones calibrées sur le PNG transparent (en %) ──────────────────────────────
// Ajuster left/top/w/h pour affiner le calage sur les cadres dorés.

const ZONES: Zone[] = [
  // ── Mur gauche – fenêtres hautes
  { id:  0, label: "Fenêtre HG 1",         left:  1, top:  2, w:  9, h: 20 },
  { id:  1, label: "Fenêtre HG 2",         left: 11, top:  2, w:  8, h: 20 },
  // ── Mur gauche – grandes fenêtres basses
  { id:  2, label: "Fenêtre BG grande",    left:  1, top: 23, w: 10, h: 30 },
  { id:  3, label: "Fenêtre BG 2",         left: 11, top: 23, w:  8, h: 20 },
  // ── Mur gauche – cadres sur le panneau
  { id:  4, label: "Cadre G haut",         left: 20, top:  2, w: 10, h: 22 },
  { id:  5, label: "Cadre G milieu",       left: 20, top: 25, w: 10, h: 20 },
  // ── Cadre incliné (tableau posé au sol)
  { id:  6, label: "Cadre incliné",        left:  8, top: 40, w: 14, h: 22 },
  // ── Miroir ovale bas gauche
  { id:  7, label: "Miroir ovale G",       left: 13, top: 63, w: 12, h: 18 },
  // ── Mur centre-gauche
  { id:  8, label: "Centre-G haut",        left: 29, top:  2, w: 12, h: 24 },
  { id:  9, label: "Centre-G milieu",      left: 29, top: 27, w:  8, h: 20 },
  { id: 10, label: "Centre-G bas",         left: 38, top: 27, w:  7, h: 20 },
  // ── Centre haut (au-dessus de la porte)
  { id: 11, label: "Centre haut",          left: 43, top:  2, w: 13, h: 16 },
  { id: 12, label: "Centre haut 2",        left: 43, top: 19, w:  7, h: 10 },
  // ── Miroir ovale droite (grand)
  { id: 13, label: "Miroir ovale D",       left: 59, top: 28, w: 13, h: 32 },
  // ── Mur droite – rangée haute
  { id: 14, label: "Fenêtre HD 1",         left: 61, top:  2, w:  9, h: 16 },
  { id: 15, label: "Fenêtre HD 2",         left: 71, top:  2, w:  8, h: 11 },
  { id: 16, label: "Fenêtre HD 3",         left: 80, top:  2, w:  9, h: 11 },
  { id: 17, label: "Fenêtre HD 4",         left: 90, top:  2, w:  9, h: 11 },
  // ── Mur droite – rangée intermédiaire
  { id: 18, label: "Cadre D inter 1",      left: 61, top: 19, w: 12, h: 19 },
  { id: 19, label: "Cadre D inter 2",      left: 74, top: 14, w:  9, h: 17 },
  { id: 20, label: "Cadre D inter 3",      left: 84, top: 14, w:  5, h: 17 },
  { id: 21, label: "Cadre D inter 4",      left: 90, top: 14, w:  9, h: 17 },
  // ── Mur droite – rangée basse
  { id: 22, label: "Cadre D bas 1",        left: 74, top: 32, w:  9, h: 18 },
  { id: 23, label: "Cadre D bas 2",        left: 84, top: 32, w:  5, h: 18 },
  { id: 24, label: "Cadre D bas 3",        left: 90, top: 32, w:  9, h: 18 },
  // ── Mur droite – extrême droite supplémentaires
  { id: 25, label: "Cadre ED haut",        left: 90, top: 52, w:  9, h: 14 },
  { id: 26, label: "Cadre ED bas",         left: 74, top: 51, w: 15, h: 18 },
  // ── Panneau droit bas
  { id: 27, label: "Panneau D bas",        left: 61, top: 52, w: 12, h: 16 },
  // ── Fenêtres basses droite
  { id: 28, label: "Fenêtre BD 1",         left: 80, top: 52, w:  9, h: 14 },
  { id: 29, label: "Fenêtre BD 2",         left: 84, top: 67, w: 15, h: 14 },
]

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

// ─── Composition canvas ──────────────────────────────────────────────────────────
//
// 1. Fond beige sur le canvas principal
// 2. Pour chaque zone : luminaire sur canvas off-screen avec globalCompositeOperation
//    "multiply" (fond blanc → beige, pas de boucle pixel = rapide)
// 3. Tableau RGBA par-dessus : pixels opaques couvrent tout,
//    pixels transparents laissent apparaître les luminaires

async function renderComposite(
  canvas:   HTMLCanvasElement,
  painting: HTMLImageElement,
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

  // 2. Luminaires en parallèle (multiply remplace la boucle pixel → GPU)
  await Promise.all(
    ZONES.map(async (zone, i) => {
      const lum = sel[i]
      if (!lum) return

      const zx = Math.round(zone.left * W / 100)
      const zy = Math.round(zone.top  * H / 100)
      const zw = Math.round(zone.w    * W / 100)
      const zh = Math.round(zone.h    * H / 100)
      if (zw < 2 || zh < 2) return

      let img: HTMLImageElement
      try {
        img = await Promise.race([
          loadImg(lum.imageUrl),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
        ]) as HTMLImageElement
      } catch { return }

      // Canvas off-screen dédié à ce luminaire
      const oc    = document.createElement("canvas")
      oc.width    = zw
      oc.height   = zh
      const oc_ctx = oc.getContext("2d")!
      oc_ctx.imageSmoothingEnabled = true
      oc_ctx.imageSmoothingQuality = "high"

      // Fond beige sur le canvas off-screen
      oc_ctx.fillStyle = "#f5f0e8"
      oc_ctx.fillRect(0, 0, zw, zh)

      // Multiply : blanc × beige = beige, couleurs assombries légèrement
      // → élimine les fonds blancs/clairs sans boucle pixel
      oc_ctx.globalCompositeOperation = "multiply"

      // object-fit: contain avec 10 % de marge
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

      // Copier sur le canvas principal
      ctx.drawImage(oc, zx, zy)
    })
  )

  // 3. Tableau RGBA par-dessus
  ctx.drawImage(painting, 0, 0, W, H)
}

// ─── Museum label ────────────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: { lum: GalleryLuminaire; visible: boolean; below: boolean }) {
  const pos      = below ? { top: "calc(100% + 6px)", bottom: "auto" } : { bottom: "calc(100% + 6px)", top: "auto" }
  const arrowOut = below
    ? { top: -7, bottom: "auto", borderBottom: "7px solid #b8974a", borderTop: "none" }
    : { bottom: -7, top: "auto", borderTop: "7px solid #b8974a", borderBottom: "none" }
  const arrowIn  = below
    ? { top: -5, bottom: "auto", borderBottom: "6px solid #f0e6c0", borderTop: "none" }
    : { bottom: -5, top: "auto", borderTop: "6px solid #f0e6c0", borderBottom: "none" }
  return (
    <div className="pointer-events-none absolute z-50"
      style={{ ...pos, left:"50%", transform:"translateX(-50%)", minWidth:150, maxWidth:200, opacity:visible?1:0, transition:"opacity 0.2s ease" }}>
      <div style={{ background:"linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)", border:"1px solid #b8974a", borderRadius:2, padding:"8px 10px", boxShadow:"0 2px 10px rgba(0,0,0,.35)", position:"relative" }}>
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", ...arrowOut }} />
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", ...arrowIn }} />
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
  const activeRef    = useRef<"A" | "B">("A")
  const paintingRef  = useRef<HTMLImageElement | null>(null)
  const imgSizeRef   = useRef({ w: 1330, h: 560 })

  const [pool,          setPool]          = useState<GalleryLuminaire[]>([])
  const [current,       setCurrent]       = useState<GalleryLuminaire[]>([])
  const [paintingReady, setPaintingReady] = useState(false)
  const [imgSize,       setImgSize]       = useState({ w: 1330, h: 560 })
  const [phase,         setPhase]         = useState<"loading"|"compositing"|"ready"|"error">("loading")
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

  // ── Chargement du tableau (state pour déclencher re-render) ──────────────────────
  useEffect(() => {
    if (!transparentUrl) return
    let cancelled = false
    setPhase("loading")
    setPaintingReady(false)

    loadImg(transparentUrl).then(img => {
      if (cancelled) return
      paintingRef.current = img
      imgSizeRef.current  = { w: img.naturalWidth, h: img.naturalHeight }
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
      setPaintingReady(true)
    }).catch(() => { if (!cancelled) setPhase("error") })

    return () => { cancelled = true }
  }, [transparentUrl])

  // ── Première composition dès que tableau + pool sont prêts ───────────────────────
  useEffect(() => {
    if (!paintingReady || pool.length === 0 || currentRef.current.length > 0) return
    ;(async () => {
      const sel = pickRandom(pool, ZONES.length)
      currentRef.current = sel
      historyRef.current = [sel]
      setCurrent(sel)
      setHasPrev(false)
      setPhase("compositing")
      const { w: W, h: H } = imgSizeRef.current
      await renderComposite(canvasARef.current!, paintingRef.current!, sel, W, H)
      activeRef.current = "A"
      setAlphaA(1); setAlphaB(0)
      setPhase("ready")
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, paintingReady])

  // ── Rotation avec crossfade A↔B ──────────────────────────────────────────────────
  const doRotate = useCallback(async (dir: "next" | "prev") => {
    if (pool.length === 0 || !paintingRef.current) return

    let sel: GalleryLuminaire[]
    if (dir === "next") {
      sel = pickRandom(pool, ZONES.length)
      historyRef.current = [...historyRef.current.slice(-10), sel]
    } else {
      const h = historyRef.current
      sel = h.length > 1 ? h[h.length - 2] : currentRef.current
      historyRef.current = h.length > 1 ? h.slice(0, -1) : h
    }
    setHasPrev(historyRef.current.length > 1)
    currentRef.current = sel
    setCurrent(sel)

    const inactive     = activeRef.current === "A" ? "B" : "A"
    const targetCanvas = inactive === "A" ? canvasARef.current! : canvasBRef.current!
    const { w: W, h: H } = imgSizeRef.current

    await renderComposite(targetCanvas, paintingRef.current!, sel, W, H)

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

        {/* Tableau affiché immédiatement en fond pendant la composition ── */}
        {/* Invisible dès que le canvas est prêt (alphaA/B = 1 couvre tout)  */}
        <img
          src={transparentUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full block"
          style={{ objectFit: "fill", zIndex: 0 }}
        />

        {/* Canvas A */}
        <canvas ref={canvasARef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:1, opacity:alphaA, transition:"opacity 0.8s ease" }}
        />
        {/* Canvas B */}
        <canvas ref={canvasBRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", zIndex:1, opacity:alphaB, transition:"opacity 0.8s ease" }}
        />

        {phase === "compositing" && (
          <div className="absolute inset-0 z-20 flex items-end justify-center pb-6" style={{ background:"rgba(245,241,232,0.0)" }}>
            <p className="font-serif text-xs italic text-stone-500 bg-white/60 px-3 py-1 rounded-full">
              Placement des luminaires…
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-100">
            <p className="font-serif text-sm italic text-red-400">Erreur de chargement du tableau</p>
          </div>
        )}

      </div>

      {/* Zones interactives hors overflow-hidden */}
      {phase === "ready" && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex:5 }}>
          {ZONES.map((zone, i) => {
            const lum   = current[i]
            const below = zone.top < 40
            return (
              <div key={zone.id} className="absolute cursor-pointer"
                style={{ left:`${zone.left}%`, top:`${zone.top}%`, width:`${zone.w}%`, height:`${zone.h}%`, pointerEvents:"auto" }}
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
