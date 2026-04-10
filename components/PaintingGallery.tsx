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

interface ZoneBBox {
  id: number
  x:  number
  y:  number
  w:  number
  h:  number
}

// ─── Constantes ─────────────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 30_000
const MIN_ZONE_PIXELS   = 300        // ignore les petits artefacts transparents
const ZONE_BG           = "#b8a898"  // fond visible avant chargement du luminaire

// ─── Utilitaires ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error(`Cannot load: ${src}`))
    img.src     = src
  })
}

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

/**
 * BFS sur le canal alpha pour détecter les zones transparentes du PNG.
 * Retourne uniquement les bounding-boxes (pas de tableau pixel-par-pixel).
 */
function detectTransparentZones(data: Uint8ClampedArray, W: number, H: number): ZoneBBox[] {
  const visited = new Uint8Array(W * H)
  const zones: ZoneBBox[] = []

  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const si = sy * W + sx
      if (visited[si]) continue
      if (data[si * 4 + 3] > 128) continue  // pixel opaque → pas une zone

      let x0 = W, x1 = 0, y0 = H, y1 = 0
      let count = 0
      const q: number[] = [si]
      visited[si] = 1
      let qi = 0

      while (qi < q.length) {
        const ci = q[qi++]
        count++
        const cy = (ci / W) | 0, cx = ci % W
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx
        if (cy < y0) y0 = cy; if (cy > y1) y1 = cy

        if (cx > 0)     { const n = ci - 1; if (!visited[n] && data[n * 4 + 3] <= 128) { visited[n] = 1; q.push(n) } }
        if (cx < W - 1) { const n = ci + 1; if (!visited[n] && data[n * 4 + 3] <= 128) { visited[n] = 1; q.push(n) } }
        if (cy > 0)     { const n = ci - W; if (!visited[n] && data[n * 4 + 3] <= 128) { visited[n] = 1; q.push(n) } }
        if (cy < H - 1) { const n = ci + W; if (!visited[n] && data[n * 4 + 3] <= 128) { visited[n] = 1; q.push(n) } }
      }

      if (count < MIN_ZONE_PIXELS) continue
      zones.push({ id: zones.length, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 })
    }
  }

  return zones
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((z, i) => ({ ...z, id: i }))
}

// ─── Museum label tooltip ────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: {
  lum:     GalleryLuminaire
  visible: boolean
  below:   boolean    // true = zone dans le tiers supérieur → tooltip vers le bas
}) {
  const pos = below
    ? { top: "calc(100% + 6px)", bottom: "auto" }
    : { bottom: "calc(100% + 6px)", top: "auto" }

  const arrowOuter = below
    ? { top: -7, bottom: "auto", borderBottom: "7px solid #b8974a", borderTop: "none" }
    : { bottom: -7, top: "auto", borderTop:    "7px solid #b8974a", borderBottom: "none" }
  const arrowInner = below
    ? { top: -5, bottom: "auto", borderBottom: "6px solid #f0e6c0", borderTop: "none" }
    : { bottom: -5, top: "auto", borderTop:    "6px solid #f0e6c0", borderBottom: "none" }

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

// ─── Composant principal ─────────────────────────────────────────────────────────

export function PaintingGallery({
  paintingUrl,       // tableau de fond original (affiché en arrière-plan, z-0)
  transparentUrl,    // PNG avec zones de cadres transparentes (overlay, z-2)
}: {
  paintingUrl?:    string
  transparentUrl?: string
}) {
  const [zones,       setZones]       = useState<ZoneBBox[]>([])
  const [pool,        setPool]        = useState<GalleryLuminaire[]>([])
  // currentLums : affiché en background-image sur chaque zone (stable, pas de transition)
  const [currentLums, setCurrentLums] = useState<GalleryLuminaire[]>([])
  // nextLums : affiché en <img> qui fade-in par-dessus currentLums
  const [nextLums,    setNextLums]    = useState<GalleryLuminaire[]>([])
  const [fadingIn,    setFadingIn]    = useState(false)
  const [phase,       setPhase]       = useState<"idle"|"loading"|"detecting"|"ready"|"error">("idle")
  const [imgSize,     setImgSize]     = useState({ w: 1330, h: 876 })
  const [hovZone,     setHovZone]     = useState<number | null>(null)
  const [hovering,    setHovering]    = useState(false)
  const [hasPrev,     setHasPrev]     = useState(false)

  const historyRef   = useRef<GalleryLuminaire[][]>([])
  const currentRef   = useRef<GalleryLuminaire[]>([])
  const zonesRef     = useRef<ZoneBBox[]>([])
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const rotatingRef  = useRef(false)   // garde contre les rotations simultanées (ref, pas state)

  // ── Chargement du pool ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => { if (d.success) setPool(d.luminaires) })
      .catch(() => {})
  }, [])

  // ── Chargement + détection des zones depuis le PNG transparent ─────────────────
  useEffect(() => {
    const url = transparentUrl || paintingUrl
    if (!url) return
    let cancelled = false

    ;(async () => {
      try {
        setPhase("loading")
        const img = await loadImg(url)
        if (cancelled) return

        const W = img.naturalWidth, H = img.naturalHeight
        setImgSize({ w: W, h: H })

        // Détection des zones transparentes — toujours depuis l'overlay (transparentUrl ou paintingUrl)
        setPhase("detecting")
        const tmp = document.createElement("canvas")
        tmp.width = W; tmp.height = H
        tmp.getContext("2d")!.drawImage(img, 0, 0)
        const data = tmp.getContext("2d")!.getImageData(0, 0, W, H).data
        if (cancelled) return

        const detected = detectTransparentZones(data, W, H)
        console.log(`[PaintingGallery] ${detected.length} zone(s) transparente(s)`, detected.map(z => `#${z.id} ${z.w}×${z.h} @(${z.x},${z.y})`))
        zonesRef.current = detected
        setZones(detected)

        if (!cancelled) setPhase("ready")
      } catch (e) {
        console.error("PaintingGallery:", e)
        if (!cancelled) setPhase("error")
      }
    })()

    return () => { cancelled = true }
  }, [transparentUrl, paintingUrl])

  // ── Assignation initiale des luminaires (zones + pool tous deux prêts) ─────────
  useEffect(() => {
    if (pool.length === 0 || zonesRef.current.length === 0 || currentRef.current.length > 0) return
    const sel = pickRandom(pool, zonesRef.current.length)
    currentRef.current = sel
    historyRef.current = [sel]
    setCurrentLums(sel)
    setHasPrev(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, zones])   // zones en dépendance pour déclencher après la détection

  // ── Rotation : crossfade CSS background-image → <img> fade-in → swap ─────────
  const doRotate = useCallback(async (dir: "next" | "prev") => {
    if (rotatingRef.current || zonesRef.current.length === 0 || pool.length === 0) return
    rotatingRef.current = true

    let sel: GalleryLuminaire[]
    if (dir === "next") {
      sel = pickRandom(pool, zonesRef.current.length)
      historyRef.current = [...historyRef.current.slice(-10), sel]
    } else {
      const h = historyRef.current
      sel = h.length > 1 ? h[h.length - 2] : currentRef.current
      historyRef.current = h.length > 1 ? h.slice(0, -1) : h
    }
    setHasPrev(historyRef.current.length > 1)
    currentRef.current = sel

    // 1. Monter les nouveaux <img> (opacity 0) pour démarrer leur chargement
    setNextLums(sel)

    // 2. Attendre deux frames pour que React commite + le navigateur rende les <img>
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))

    // 3. Déclencher le fade-in CSS (opacity 0 → 1 en 0.8s)
    setFadingIn(true)
    await sleep(850)

    // 4. Swap sans flash :
    //    currentLums prend les nouvelles images (backgroundImage change instantanément)
    //    fadingIn passe à false (img repasse à opacity 0 sans transition)
    //    nextLums vidé
    setCurrentLums(sel)
    setFadingIn(false)
    setNextLums([])

    rotatingRef.current = false
  }, [pool])

  // ── Timer 30s ─────────────────────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => doRotate("next"), ROTATION_INTERVAL)
  }, [doRotate])

  useEffect(() => {
    if (phase !== "ready" || pool.length === 0 || zones.length === 0) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, pool.length, zones.length, resetTimer])

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  const overlayUrl = transparentUrl || paintingUrl

  if (!overlayUrl) {
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

        {/* z-0 — fond neutre (visible pendant le chargement, et à travers les trous avant que les luminaires chargent) */}
        {/* Quand transparentUrl est défini, on N'affiche PAS paintingUrl ici : il serait opaque et couvrirait les luminaires en z-1 */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#c8bfb0" }} />

        {/* z-1 — conteneurs de luminaires, un par zone transparente */}
        {zones.map((zone, i) => (
          <div
            key={zone.id}
            style={{
              position:            "absolute",
              left:                `${(zone.x / iW) * 100}%`,
              top:                 `${(zone.y / iH) * 100}%`,
              width:               `${(zone.w / iW) * 100}%`,
              height:              `${(zone.h / iH) * 100}%`,
              zIndex:              1,
              backgroundColor:     ZONE_BG,
              // Luminaire courant affiché en background-image (stable, sans transition)
              backgroundImage:     currentLums[i] ? `url("${currentLums[i].imageUrl}")` : "none",
              backgroundSize:      "contain",
              backgroundRepeat:    "no-repeat",
              backgroundPosition:  "center",
              overflow:            "hidden",
            }}
          >
            {/* Prochain luminaire : fade-in par-dessus le courant */}
            {nextLums[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nextLums[i].imageUrl}
                alt=""
                draggable={false}
                style={{
                  position:   "absolute",
                  inset:      0,
                  width:      "100%",
                  height:     "100%",
                  objectFit:  "contain",
                  opacity:    fadingIn ? 1 : 0,
                  transition: fadingIn ? "opacity 0.8s ease" : "none",
                }}
              />
            )}
          </div>
        ))}

        {/* z-2 — PNG transparent par-dessus tout : les dorures encadrent naturellement les luminaires */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={overlayUrl}
          alt=""
          draggable={false}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", zIndex: 2, pointerEvents: "none" }}
        />

        {/* Overlay de chargement */}
        {(phase === "loading" || phase === "detecting") && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(245,241,232,0.82)", zIndex: 10 }}>
            <p className="font-serif text-sm italic text-stone-600">
              {phase === "loading"   && "Chargement du tableau…"}
              {phase === "detecting" && "Détection des cadres…"}
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100" style={{ zIndex: 10 }}>
            <p className="font-serif text-sm italic text-red-400">Erreur de chargement du tableau</p>
          </div>
        )}

      </div>

      {/* Zones interactives — EN DEHORS de overflow-hidden pour que les tooltips ne soient pas clippés */}
      {phase === "ready" && zones.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
          {zones.map((zone, i) => {
            const lum   = currentLums[i]
            const below = zone.y / iH < 0.4
            return (
              <div
                key={zone.id}
                className="absolute cursor-pointer"
                style={{
                  left:          `${(zone.x / iW) * 100}%`,
                  top:           `${(zone.y / iH) * 100}%`,
                  width:         `${(zone.w / iW) * 100}%`,
                  height:        `${(zone.h / iH) * 100}%`,
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

      {/* Flèches de navigation */}
      <button
        onClick={() => { resetTimer(); doRotate("prev") }}
        disabled={!hasPrev}
        aria-label="Sélection précédente"
        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,.28)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", opacity: hovering ? (hasPrev ? 1 : 0.2) : 0, transition: "opacity .3s ease" }}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        onClick={() => { resetTimer(); doRotate("next") }}
        aria-label="Sélection suivante"
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,.28)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", opacity: hovering ? 1 : 0, transition: "opacity .3s ease" }}
      >
        <ChevronRight size={20} />
      </button>

    </section>
  )
}
