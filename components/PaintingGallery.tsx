"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface GalleryLuminaire {
  _id:      string
  nom:      string
  designer: string
  annee:    string | number
  imageUrl: string
}

interface Zone {
  id:   number
  xPct: number
  yPct: number
  wPct: number
  hPct: number
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 30_000
const ZONE_BG           = "#b8a898"
const N_ZONES           = 8   // nombre max de zones à détecter

// ─── Utilitaires ──────────────────────────────────────────────────────────────

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

// ─── Détection automatique des zones transparentes ───────────────────────────
// Downsampling en grille 80×60, BFS sur les cellules transparentes

function detectTransparentZones(imgData: ImageData, W: number, H: number, nMax: number): Zone[] {
  const GW = 80, GH = 60
  const grid = new Uint8Array(GW * GH)

  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
      // Compter les pixels transparents sur 4 échantillons par cellule
      let transparent = 0
      for (let s = 0; s < 4; s++) {
        const px = Math.min(W - 1, Math.floor((gx + (s & 1) * 0.5 + 0.25) * W / GW))
        const py = Math.min(H - 1, Math.floor((gy + ((s >> 1) & 1) * 0.5 + 0.25) * H / GH))
        if (imgData.data[(py * W + px) * 4 + 3] < 64) transparent++
      }
      grid[gy * GW + gx] = transparent >= 2 ? 1 : 0
    }
  }

  // BFS pour trouver les composantes connexes
  const visited = new Uint8Array(GW * GH)
  const components: { minX: number; maxX: number; minY: number; maxY: number; size: number }[] = []

  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      if (!grid[y * GW + x] || visited[y * GW + x]) continue
      const q: [number, number][] = [[x, y]]
      visited[y * GW + x] = 1
      let minX = x, maxX = x, minY = y, maxY = y, size = 0, qi = 0
      while (qi < q.length) {
        const [cx, cy] = q[qi++]
        size++
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue
          if (!grid[ny * GW + nx] || visited[ny * GW + nx]) continue
          visited[ny * GW + nx] = 1
          q.push([nx, ny])
          if (nx < minX) minX = nx; if (nx > maxX) maxX = nx
          if (ny < minY) minY = ny; if (ny > maxY) maxY = ny
        }
      }
      if (size >= 6) components.push({ minX, maxX, minY, maxY, size })
    }
  }

  // Trier par taille décroissante, prendre les N premières
  components.sort((a, b) => b.size - a.size)

  return components.slice(0, nMax).map((c, id) => ({
    id,
    xPct: (c.minX / GW) * 100,
    yPct: (c.minY / GH) * 100,
    wPct: ((c.maxX - c.minX + 1) / GW) * 100,
    hPct: ((c.maxY - c.minY + 1) / GH) * 100,
  }))
}

// Fallback : grille uniforme si getImageData échoue
function makeGridZones(n: number): Zone[] {
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const w = 100 / cols, h = 100 / rows
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    xPct: (i % cols) * w,
    yPct: Math.floor(i / cols) * h,
    wPct: w,
    hPct: h,
  }))
}

// ─── Tooltip musée ────────────────────────────────────────────────────────────

function MuseumLabel({ lum, visible, below }: {
  lum:     GalleryLuminaire
  visible: boolean
  below:   boolean
}) {
  const pos    = below ? { top: "calc(100% + 6px)" } : { bottom: "calc(100% + 6px)" }
  const arrOut = below
    ? { top: -7,    borderBottom: "7px solid #b8974a", borderTop: "none" }
    : { bottom: -7, borderTop: "7px solid #b8974a",    borderBottom: "none" }
  const arrIn  = below
    ? { top: -5,    borderBottom: "6px solid #f0e6c0", borderTop: "none" }
    : { bottom: -5, borderTop: "6px solid #f0e6c0",    borderBottom: "none" }

  return (
    <div className="pointer-events-none absolute z-50"
      style={{ ...pos, left: "50%", transform: "translateX(-50%)", minWidth: 150, maxWidth: 200,
               opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}>
      <div style={{ background: "linear-gradient(135deg,#f5e9c8,#ede0b0 60%,#f0e6c0)",
                    border: "1px solid #b8974a", borderRadius: 2, padding: "8px 10px",
                    boxShadow: "0 2px 10px rgba(0,0,0,.35)", position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)",
                      width: 0, height: 0, borderLeft: "7px solid transparent",
                      borderRight: "7px solid transparent", ...arrOut }} />
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)",
                      width: 0, height: 0, borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent", ...arrIn }} />
        <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 11,
                    fontWeight: 600, color: "#3d2b0a", lineHeight: 1.3 }}>{lum.nom}</p>
        {lum.designer && (
          <p style={{ fontFamily: "Georgia,serif", fontSize: 10, fontStyle: "italic",
                      color: "#6b4f1a", marginTop: 2 }}>{lum.designer}</p>
        )}
        {lum.annee && (
          <p style={{ fontFamily: "Georgia,serif", fontSize: 9, color: "#7a5c20",
                      marginTop: 1 }}>{lum.annee}</p>
        )}
        <Link href={`/luminaires/${lum._id}`} target="_blank" rel="noopener noreferrer"
          className="pointer-events-auto block mt-1"
          style={{ fontFamily: "Georgia,serif", fontSize: 9, color: "#5a3a10",
                   textDecoration: "underline" }}>
          Voir le produit →
        </Link>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function PaintingGallery({ transparentUrl }: { transparentUrl?: string }) {

  const [pool,        setPool]        = useState<GalleryLuminaire[]>([])
  const [zones,       setZones]       = useState<Zone[]>([])
  const [currentLums, setCurrentLums] = useState<GalleryLuminaire[]>([])
  const [nextLums,    setNextLums]    = useState<GalleryLuminaire[]>([])
  const [fadingIn,    setFadingIn]    = useState(false)
  const [imgRatio,    setImgRatio]    = useState("1330 / 876")
  const [hovZone,     setHovZone]     = useState<number | null>(null)
  const [hovering,    setHovering]    = useState(false)
  const [hasPrev,     setHasPrev]     = useState(false)
  const [zonesReady,  setZonesReady]  = useState(false)

  const historyRef  = useRef<GalleryLuminaire[][]>([])
  const currentRef  = useRef<GalleryLuminaire[]>([])
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const rotatingRef = useRef(false)

  // ── 1. Pool ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/luminaires-gallery")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.luminaires.length > 0) {
          console.log(`[PaintingGallery] Pool : ${d.luminaires.length} luminaire(s)`)
          setPool(d.luminaires)
        }
      })
      .catch(() => {})
  }, [])

  // ── 2. Chargement image + détection zones transparentes ────────────────────
  useEffect(() => {
    if (!transparentUrl) return

    const img = new Image()
    // Pas de crossOrigin : image même origine → getImageData autorisé
    img.onload = () => {
      const W = img.naturalWidth
      const H = img.naturalHeight
      setImgRatio(`${W} / ${H}`)
      console.log(`[PaintingGallery] Image chargée : ${W}×${H}`)

      // Détecter les zones via canvas
      try {
        const canvas = document.createElement("canvas")
        canvas.width  = W
        canvas.height = H
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("no ctx")
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, W, H)
        const detected = detectTransparentZones(data, W, H, N_ZONES)
        console.log(`[PaintingGallery] ${detected.length} zone(s) transparente(s) détectée(s)`, detected)
        setZones(detected.length > 0 ? detected : makeGridZones(N_ZONES))
      } catch (e) {
        console.warn("[PaintingGallery] getImageData échoué → grille par défaut", e)
        setZones(makeGridZones(N_ZONES))
      }
      setZonesReady(true)
    }
    img.onerror = () => {
      console.error("[PaintingGallery] Erreur chargement image")
      setZones(makeGridZones(N_ZONES))
      setZonesReady(true)
    }
    img.src = transparentUrl
  }, [transparentUrl])

  // ── 3. Assignation initiale (pool + zones prêts) ───────────────────────────
  useEffect(() => {
    if (pool.length === 0 || !zonesReady || zones.length === 0 || currentRef.current.length > 0) return
    const sel = pickRandom(pool, zones.length)
    console.log(`[PaintingGallery] Assignation : ${sel.map((l, i) => `zone${i}→${l.nom}`).join(", ")}`)
    currentRef.current = sel
    historyRef.current = [sel]
    setCurrentLums(sel)
    setHasPrev(false)
  }, [pool, zonesReady, zones.length])

  // ── 4. Rotation ────────────────────────────────────────────────────────────
  const doRotate = useCallback(async (dir: "next" | "prev") => {
    if (rotatingRef.current || pool.length === 0 || zones.length === 0) return
    rotatingRef.current = true

    let sel: GalleryLuminaire[]
    if (dir === "next") {
      sel = pickRandom(pool, zones.length)
      historyRef.current = [...historyRef.current.slice(-10), sel]
    } else {
      const h = historyRef.current
      sel = h.length > 1 ? h[h.length - 2] : currentRef.current
      historyRef.current = h.length > 1 ? h.slice(0, -1) : h
    }
    setHasPrev(historyRef.current.length > 1)
    currentRef.current = sel

    setNextLums(sel)
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    setFadingIn(true)
    await sleep(850)
    setCurrentLums(sel)
    setFadingIn(false)
    setNextLums([])
    rotatingRef.current = false
  }, [pool, zones.length])

  // ── 5. Timer auto ──────────────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => doRotate("next"), ROTATION_INTERVAL)
  }, [doRotate])

  useEffect(() => {
    if (pool.length === 0) return
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pool.length, resetTimer])

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (!transparentUrl) {
    return (
      <section className="w-full flex items-center justify-center bg-stone-100"
               style={{ minHeight: 180 }}>
        <p className="text-sm text-stone-400 font-serif italic">
          Uploadez le tableau depuis la page Import
        </p>
      </section>
    )
  }

  return (
    <section
      className="relative w-full select-none"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Conteneur avec ratio de l'image */}
      <div className="relative w-full" style={{ aspectRatio: imgRatio }}>

        {/* z-0 — fond neutre */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: ZONE_BG }} />

        {/* z-1 — luminaires dans les zones détectées */}
        {zones.map((zone, i) => (
          <div key={zone.id}
            style={{
              position:        "absolute",
              left:            `${zone.xPct}%`,
              top:             `${zone.yPct}%`,
              width:           `${zone.wPct}%`,
              height:          `${zone.hPct}%`,
              zIndex:          1,
              backgroundColor: ZONE_BG,
              overflow:        "hidden",
            }}
          >
            {/* Luminaire courant */}
            {currentLums[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentLums[i].imageUrl}
                alt=""
                draggable={false}
                style={{
                  position:  "absolute",
                  inset:     0,
                  width:     "100%",
                  height:    "100%",
                  objectFit: "contain",
                }}
              />
            )}
            {/* Prochain luminaire (crossfade) */}
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

        {/* z-2 — PNG transparent par-dessus (le tableau avec trous) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={transparentUrl}
          alt=""
          draggable={false}
          style={{
            position:      "absolute",
            inset:         0,
            width:         "100%",
            height:        "100%",
            display:       "block",
            zIndex:        2,
            pointerEvents: "none",
          }}
        />

      </div>

      {/* Zones de survol — hors overflow pour que les tooltips ne soient pas clippés */}
      {zonesReady && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
          {zones.map((zone, i) => {
            const lum   = currentLums[i]
            const below = zone.yPct < 40
            return (
              <div key={zone.id}
                className="absolute cursor-pointer"
                style={{
                  left:          `${zone.xPct}%`,
                  top:           `${zone.yPct}%`,
                  width:         `${zone.wPct}%`,
                  height:        `${zone.hPct}%`,
                  pointerEvents: "auto",
                }}
                onMouseEnter={() => setHovZone(zone.id)}
                onMouseLeave={() => setHovZone(null)}
              >
                {lum && (
                  <MuseumLabel lum={lum} visible={hovZone === zone.id} below={below} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bouton précédent */}
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
          opacity: hovering ? (hasPrev ? 1 : 0.2) : 0, transition: "opacity .3s ease",
        }}
      >
        <ChevronLeft size={20} />
      </button>

      {/* Bouton suivant */}
      <button
        onClick={() => { resetTimer(); doRotate("next") }}
        aria-label="Sélection suivante"
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          zIndex: 10, width: 38, height: 38, borderRadius: "50%",
          background: "rgba(0,0,0,.28)", border: "none", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", backdropFilter: "blur(4px)",
          opacity: hovering ? 1 : 0, transition: "opacity .3s ease",
        }}
      >
        <ChevronRight size={20} />
      </button>

    </section>
  )
}
