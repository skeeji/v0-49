"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface GalleryLuminaire {
  _id: string
  nom: string
  designer: string
  annee: string | number
  imageUrl: string
}

interface Zone {
  id:   number
  bbox: { x: number; y: number; w: number; h: number }
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 30_000
const ZONE_BG           = "#b8a898"

// ─── Utilitaires ─────────────────────────────────────────────────────────────

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
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error(`Cannot load: ${src}`))
    img.src     = src
  })
}

// ─── Composite : dessine les luminaires sur un canvas (fond transparent) ──────
// Le PNG transparent est posé PAR-DESSUS en HTML (z-3) :
//   zones opaques → masquent le canvas  |  zones transparentes → révèlent le canvas

async function compositeZones(
  canvas: HTMLCanvasElement,
  sel:    GalleryLuminaire[],
  zones:  Zone[],
  W:      number,
  H:      number
): Promise<void> {
  const dpr = window.devicePixelRatio || 1
  canvas.width  = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, W * dpr, H * dpr)
  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  const lumImages = await Promise.all(
    sel.map(l => loadImg(l.imageUrl).catch(() => null))
  )

  for (let i = 0; i < zones.length; i++) {
    const img = lumImages[i]
    if (!img) continue
    const { x, y, w, h } = zones[i].bbox
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight)
    const dW    = img.naturalWidth  * scale
    const dH    = img.naturalHeight * scale
    ctx.drawImage(img, x + (w - dW) / 2, y + (h - dH) / 2, dW, dH)
  }

  ctx.restore()
}

// ─── Museum label ─────────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: { lum: GalleryLuminaire; visible: boolean; below: boolean }) {
  const pos = below
    ? { top: "calc(100% + 6px)", bottom: "auto" }
    : { bottom: "calc(100% + 6px)", top: "auto" }
  const arrowOuter = below
    ? { top: -7,    bottom: "auto", borderBottom: "7px solid #b8974a", borderTop: "none" }
    : { bottom: -7, top: "auto",    borderTop: "7px solid #b8974a",    borderBottom: "none" }
  const arrowInner = below
    ? { top: -5,    bottom: "auto", borderBottom: "6px solid #f0e6c0", borderTop: "none" }
    : { bottom: -5, top: "auto",    borderTop: "6px solid #f0e6c0",    borderBottom: "none" }

  return (
    <div className="pointer-events-none absolute z-50"
      style={{ ...pos, left: "50%", transform: "translateX(-50%)", minWidth: 150, maxWidth: 200, opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}>
      <div style={{ background: "linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)", border: "1px solid #b8974a", borderRadius: 2, padding: "8px 10px", boxShadow: "0 2px 10px rgba(0,0,0,.35)", position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", ...arrowOuter }} />
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", ...arrowInner }} />
        <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 11, fontWeight: 600, color: "#3d2b0a", lineHeight: 1.3 }}>{lum.nom}</p>
        {lum.designer && <p style={{ fontFamily: "Georgia,serif", fontSize: 10, fontStyle: "italic", color: "#6b4f1a", marginTop: 2 }}>{lum.designer}</p>}
        {lum.annee    && <p style={{ fontFamily: "Georgia,serif", fontSize: 9,  color: "#7a5c20", marginTop: 1 }}>{lum.annee}</p>}
        <Link href={`/luminaires/${lum._id}`} target="_blank" rel="noopener noreferrer"
          className="pointer-events-auto block mt-1"
          style={{ fontFamily: "Georgia,serif", fontSize: 9, color: "#5a3a10", textDecoration: "underline" }}>
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function PaintingGallery({ transparentUrl }: { transparentUrl?: string }) {

  const canvasARef  = useRef<HTMLCanvasElement>(null)
  const canvasBRef  = useRef<HTMLCanvasElement>(null)
  const activeRef   = useRef<"A" | "B">("A")

  const zonesRef    = useRef<Zone[]>([])
  const imgSizeRef  = useRef({ w: 1330, h: 876 })
  const historyRef  = useRef<GalleryLuminaire[][]>([])
  const currentRef  = useRef<GalleryLuminaire[]>([])
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const rotatingRef = useRef(false)

  const [pool,     setPool]     = useState<GalleryLuminaire[]>([])
  const [current,  setCurrent]  = useState<GalleryLuminaire[]>([])
  const [zones,    setZones]    = useState<Zone[]>([])
  const [phase,    setPhase]    = useState<"idle" | "loading" | "compositing" | "ready" | "error">("idle")
  const [alphaA,   setAlphaA]   = useState(0)
  const [alphaB,   setAlphaB]   = useState(0)
  const [hovZone,  setHovZone]  = useState<number | null>(null)
  const [hovering, setHovering] = useState(false)
  const [hasPrev,  setHasPrev]  = useState(false)

  // ── 1. Charger le pool ────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.luminaires.length > 0) {
          console.log(`[PaintingGallery] Pool : ${d.luminaires.length} luminaire(s)`)
          setPool(d.luminaires)
        } else {
          console.warn("[PaintingGallery] Pool vide ou erreur", d)
        }
      })
      .catch(e => console.error("[PaintingGallery] Pool fetch error:", e))
  }, [])

  // ── 2. Charger les zones depuis le serveur (pas de getImageData) ──────────
  useEffect(() => {
    if (!transparentUrl) return
    setPhase("loading")
    console.log("[PaintingGallery] transparentUrl:", transparentUrl)

    fetch("/api/painting-zones")
      .then(r => r.json())
      .then(data => {
        if (!data.success || !data.zones?.length) {
          console.error("[PaintingGallery] painting-zones erreur:", data)
          setPhase("error")
          return
        }
        console.log(`[PaintingGallery] ${data.zones.length} zone(s) serveur — ${data.width}×${data.height}`)
        imgSizeRef.current = { w: data.width, h: data.height }
        zonesRef.current   = data.zones
        setZones(data.zones)
        setPhase("ready")   // zones prêtes, on attend le pool
      })
      .catch(e => {
        console.error("[PaintingGallery] painting-zones fetch error:", e)
        setPhase("error")
      })
  }, [transparentUrl])

  const doComposite = useCallback(async (
    sel:    GalleryLuminaire[],
    zns:    Zone[],
    W:      number,
    H:      number,
    target: HTMLCanvasElement
  ) => {
    await compositeZones(target, sel, zns, W, H)
  }, [])

  // ── 3. Assignation initiale dès que pool + zones sont prêts ───────────────
  useEffect(() => {
    if (pool.length === 0 || zonesRef.current.length === 0 || currentRef.current.length > 0) return
    if (!canvasARef.current) return
    ;(async () => {
      const { w: W, h: H } = imgSizeRef.current
      const sel = pickRandom(pool, zonesRef.current.length)
      currentRef.current = sel; historyRef.current = [sel]
      setCurrent(sel); setHasPrev(false)
      setPhase("compositing")
      console.log("[PaintingGallery] Compositing initial…", sel.map((l, i) => `zone${i}→${l.nom}`))
      await doComposite(sel, zonesRef.current, W, H, canvasARef.current!)
      activeRef.current = "A"
      setAlphaA(1)
      setPhase("ready")
    })()
  }, [pool, zones, doComposite])   // zones dans la dep array pour retrigger si elles arrivent après le pool

  // ── 4. Rotation avec crossfade A↔B ───────────────────────────────────────
  const doRotate = useCallback(async (dir: "next" | "prev") => {
    const zns = zonesRef.current
    if (zns.length === 0 || pool.length === 0 || rotatingRef.current) return
    rotatingRef.current = true

    const inactive     = activeRef.current === "A" ? "B" : "A"
    const targetCanvas = inactive === "A" ? canvasARef.current : canvasBRef.current
    if (!targetCanvas) { rotatingRef.current = false; return }

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
    await doComposite(sel, zns, W, H, targetCanvas)

    if (inactive === "A") { setAlphaA(1); setAlphaB(0) }
    else                  { setAlphaA(0); setAlphaB(1) }

    await sleep(850)
    activeRef.current   = inactive
    rotatingRef.current = false
  }, [pool, doComposite])

  // ── 5. Timer ──────────────────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => doRotate("next"), ROTATION_INTERVAL)
  }, [doRotate])

  useEffect(() => {
    if (phase !== "ready" || pool.length === 0 || currentRef.current.length === 0) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, pool.length, resetTimer])

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (!transparentUrl) {
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
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${iW} / ${iH}` }}>

        {/* z-1 — fond neutre (toujours visible) */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: ZONE_BG }} />

        {/* z-2 — canvas A : luminaires, fond transparent */}
        <canvas ref={canvasARef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block",
                   zIndex: 2, opacity: alphaA, transition: "opacity 0.8s ease" }}
        />
        {/* z-2 — canvas B : cible du crossfade */}
        <canvas ref={canvasBRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block",
                   zIndex: 2, opacity: alphaB, transition: "opacity 0.8s ease" }}
        />

        {/* z-3 — PNG transparent : zones opaques masquent les canvas, zones transparentes les révèlent */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={transparentUrl} alt="" draggable={false}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block",
                   zIndex: 3, pointerEvents: "none" }}
        />

        {(phase === "loading" || phase === "compositing") && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(245,241,232,0.75)" }}>
            <p className="font-serif text-sm italic text-stone-600">
              {phase === "loading"     ? "Chargement du tableau…" : "Placement des luminaires…"}
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-100">
            <p className="font-serif text-sm italic text-red-400">Erreur — le PNG doit être en mode RGBA</p>
          </div>
        )}

      </div>

      {/* Zones de survol — hors overflow-hidden pour les tooltips */}
      {phase === "ready" && zones.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
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
        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,.28)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", opacity: hovering ? (hasPrev ? 1 : 0.2) : 0, transition: "opacity .3s ease" }}>
        <ChevronLeft size={20} />
      </button>

      <button onClick={() => { resetTimer(); doRotate("next") }}
        aria-label="Sélection suivante"
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,.28)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", opacity: hovering ? 1 : 0, transition: "opacity .3s ease" }}>
        <ChevronRight size={20} />
      </button>

    </section>
  )
}
