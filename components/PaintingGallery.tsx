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
  pixels: Uint32Array   // indices dans l'ImageData (y*W + x)
}

// ─── Constantes ─────────────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 30_000
const MIN_ZONE_PIXELS   = 400     // ignore les petites taches vertes

// ─── Utilitaires purs ───────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function isGreenPx(r: number, g: number, b: number): boolean {
  // Détection chroma key : vert vif, pas de brun/beige
  return g > 100 && g > r * 1.4 && g > b * 1.4
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

      // BFS avec pile (head pointer évite les shifts O(n))
      const pixels: number[] = []
      const q: number[] = [si]
      visited[si] = 1
      let qi = 0

      while (qi < q.length) {
        const ci = q[qi++]
        pixels.push(ci)
        const cy = (ci / W) | 0
        const cx = ci % W

        // 4-connexité avec vérification des bords
        if (cx > 0)     { const n = ci - 1; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
        if (cx < W - 1) { const n = ci + 1; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
        if (cy > 0)     { const n = ci - W; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
        if (cy < H - 1) { const n = ci + W; if (!visited[n]) { const r2=data[n*4],g2=data[n*4+1],b2=data[n*4+2]; if (isGreenPx(r2,g2,b2)) { visited[n]=1; q.push(n) } } }
      }

      if (pixels.length < MIN_ZONE_PIXELS) continue

      // Bounding box
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

  // Trier de gauche à droite, haut en bas
  return zones.sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
}

// ─── Composite un luminaire dans l'ImageData pour une zone ───────────────────────

async function compositeZone(
  base: Uint8ClampedArray,
  zone: GreenZone,
  lumUrl: string,
  W: number
): Promise<void> {
  const { x, y, w, h } = zone.bbox

  let img: HTMLImageElement
  try {
    img = await loadImg(lumUrl)
  } catch {
    // Luminaire non chargé → laisser les pixels verts tels quels
    return
  }

  // Canvas off-screen : image étirée exactement à la taille de la zone
  const oc = document.createElement("canvas")
  oc.width = w; oc.height = h
  const ctx = oc.getContext("2d")!

  // Étirement direct — remplit le bounding box pixel pour pixel, sans fond, sans marge
  ctx.drawImage(img, 0, 0, w, h)

  const lumD = ctx.getImageData(0, 0, w, h).data

  // Remplacement pixel par pixel — UNIQUEMENT les pixels verts de la zone
  for (let zi = 0; zi < zone.pixels.length; zi++) {
    const pi = zone.pixels[zi]
    const px = pi % W
    const py = (pi / W) | 0
    const li = ((py - y) * w + (px - x)) * 4
    const bi = pi * 4
    base[bi]     = lumD[li]
    base[bi + 1] = lumD[li + 1]
    base[bi + 2] = lumD[li + 2]
    base[bi + 3] = 255
  }
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
  // Refs lourdes (pas de re-render quand elles changent)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const origDataRef   = useRef<Uint8ClampedArray | null>(null)
  const zonesRef      = useRef<GreenZone[]>([])
  const imgSizeRef    = useRef({ w: 1330, h: 876 })
  const historyRef    = useRef<GalleryLuminaire[][]>([])
  const currentRef    = useRef<GalleryLuminaire[]>([])
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  // État UI
  const [pool,     setPool]     = useState<GalleryLuminaire[]>([])
  const [current,  setCurrent]  = useState<GalleryLuminaire[]>([])
  const [zones,    setZones]    = useState<GreenZone[]>([])
  const [phase,    setPhase]    = useState<"idle"|"loading"|"detecting"|"compositing"|"ready"|"error">("idle")
  const [alpha,    setAlpha]    = useState(0)
  const [hovZone,  setHovZone]  = useState<number | null>(null)
  const [hovering, setHovering] = useState(false)
  const [hasPrev,  setHasPrev]  = useState(false)

  // ── Charger le pool ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

  // ── Composite toutes les zones ───────────────────────────────────────────────────
  const doComposite = useCallback(async (
    sel: GalleryLuminaire[],
    zns: GreenZone[],
    W: number,
    H: number
  ) => {
    if (!canvasRef.current || !origDataRef.current) return
    const base = new Uint8ClampedArray(origDataRef.current)   // copie fraîche

    // Paralléliser le chargement des images
    await Promise.all(
      zns.map((zone, i) =>
        sel[i] ? compositeZone(base, zone, sel[i].imageUrl, W) : Promise.resolve()
      )
    )

    const ctx = canvasRef.current.getContext("2d")
    if (ctx) ctx.putImageData(new ImageData(base, W, H), 0, 0)
  }, [])

  // ── Charger et traiter le tableau de fond ───────────────────────────────────────
  useEffect(() => {
    if (!paintingUrl || !canvasRef.current) return
    let cancelled = false

    ;(async () => {
      try {
        setPhase("loading")
        setAlpha(0)

        const img = await loadImg(paintingUrl)
        if (cancelled) return

        const W = img.naturalWidth, H = img.naturalHeight
        imgSizeRef.current = { w: W, h: H }

        const canvas = canvasRef.current!
        canvas.width  = W
        canvas.height = H
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0)

        // Conserver les données originales pour les recompositions
        const imgData = ctx.getImageData(0, 0, W, H)
        origDataRef.current = new Uint8ClampedArray(imgData.data)

        setPhase("detecting")
        await sleep(16)   // laisser le navigateur peindre
        if (cancelled) return

        const detectedZones = detectGreenZones(imgData.data, W, H)
        zonesRef.current = detectedZones
        setZones(detectedZones)
        if (cancelled) return

        // Composite initial si le pool est déjà chargé
        if (pool.length > 0) {
          setPhase("compositing")
          const sel = pickRandom(pool, detectedZones.length)
          currentRef.current = sel
          historyRef.current = [sel]
          setCurrent(sel)
          setHasPrev(false)
          await doComposite(sel, detectedZones, W, H)
        }

        if (!cancelled) { setPhase("ready"); setAlpha(1) }
      } catch (e) {
        console.error("PaintingGallery:", e)
        if (!cancelled) setPhase("error")
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintingUrl, doComposite])

  // ── Pool chargé après le tableau ────────────────────────────────────────────────
  useEffect(() => {
    if (pool.length === 0 || zonesRef.current.length === 0 || currentRef.current.length > 0) return
    ;(async () => {
      const { w: W, h: H } = imgSizeRef.current
      const sel = pickRandom(pool, zonesRef.current.length)
      currentRef.current = sel
      historyRef.current = [sel]
      setCurrent(sel)
      setHasPrev(false)
      setPhase("compositing")
      await doComposite(sel, zonesRef.current, W, H)
      setPhase("ready")
      setAlpha(1)
    })()
  }, [pool, doComposite])

  // ── Rotation ─────────────────────────────────────────────────────────────────────
  const doRotate = useCallback(async (dir: "next" | "prev") => {
    const zns = zonesRef.current
    if (zns.length === 0 || pool.length === 0) return

    setAlpha(0)
    await sleep(500)    // fade out

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
    setAlpha(1)
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
        <p className="text-sm text-stone-400 font-serif italic">
          Uploadez le tableau depuis la page Import
        </p>
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
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${iW} / ${iH}` }}>

        {/* Canvas — contient le tableau composité */}
        <canvas
          ref={canvasRef}
          style={{
            position:   "absolute",
            inset:      0,
            width:      "100%",
            height:     "100%",
            display:    "block",
            opacity:    alpha,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Overlay de chargement */}
        {(phase === "loading" || phase === "detecting" || phase === "compositing") && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-200/80">
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

        {/* Zones interactives transparentes (hover → tooltip) */}
        {phase === "ready" && zones.map((zone, i) => {
          const lum = current[i]
          return (
            <div
              key={zone.id}
              className="absolute cursor-pointer"
              style={{
                left:   `${(zone.bbox.x / iW) * 100}%`,
                top:    `${(zone.bbox.y / iH) * 100}%`,
                width:  `${(zone.bbox.w / iW) * 100}%`,
                height: `${(zone.bbox.h / iH) * 100}%`,
                zIndex: 5,
              }}
              onMouseEnter={() => setHovZone(zone.id)}
              onMouseLeave={() => setHovZone(null)}
            >
              {lum && <MuseumLabel lum={lum} visible={hovZone === zone.id} />}
            </div>
          )
        })}

        {/* Flèche gauche */}
        <button
          onClick={() => { resetTimer(); doRotate("prev") }}
          disabled={!hasPrev}
          aria-label="Sélection précédente"
          style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, width: 38, height: 38, borderRadius: "50%",
            background: "rgba(0,0,0,.28)", border: "none", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(4px)",
            opacity: hovering ? (hasPrev ? 1 : 0.2) : 0,
            transition: "opacity .3s ease",
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Flèche droite */}
        <button
          onClick={() => { resetTimer(); doRotate("next") }}
          aria-label="Sélection suivante"
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, width: 38, height: 38, borderRadius: "50%",
            background: "rgba(0,0,0,.28)", border: "none", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(4px)",
            opacity: hovering ? 1 : 0,
            transition: "opacity .3s ease",
          }}
        >
          <ChevronRight size={20} />
        </button>

      </div>
    </section>
  )
}
