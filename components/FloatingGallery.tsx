"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LuminaireItem {
  _id: string
  imageUrl: string
  nom: string
  filename?: string
}

interface CardData {
  id:         string
  startX:     number
  startY:     number
  driftX:     number
  driftY:     number
  width:      number
  height:     number
  duration:   number
  delay:      number
  maxOpacity: number
  zIndex:     number
  format:     number
}

interface SearchResult {
  imageId:      string
  imageUrl:     string
  luminaireUrl: string | null
  nom:          string
  similarity:   number | null
  hasLocalMatch: boolean
}

// ─── PRNG déterministe (mulberry32) ───────────────────────────────────────────

function makePRNG(seed: number) {
  let s = seed | 0
  return (): number => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleIds(ids: string[], seed: number): string[] {
  const rand   = makePRNG(seed)
  const result = [...ids]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ─── Config des 3 couches ─────────────────────────────────────────────────────

const ANGLES_DEG = [0, 45, 90, 135, 180, 225, 270, 315]

interface LayerDef {
  seed:       number
  imgWidth:   number
  duration:   number
  maxOpacity: number
  driftMag:   number
  zIdx:       number
}

const LAYERS: LayerDef[] = [
  { seed: 42, imgWidth: 110, duration: 18, maxOpacity: 0.75, driftMag: 1200, zIdx: 1 },
  { seed: 43, imgWidth: 160, duration: 14, maxOpacity: 0.90, driftMag: 1350, zIdx: 2 },
  { seed: 44, imgWidth: 210, duration: 10, maxOpacity: 1.00, driftMag: 1500, zIdx: 3 },
]

function buildCards(): CardData[] {
  const cards: CardData[] = []
  let globalIdx = 0
  LAYERS.forEach((layer, li) => {
    const rand = makePRNG(layer.seed)
    ANGLES_DEG.forEach((angleDeg, ai) => {
      const rad         = (angleDeg * Math.PI) / 180
      const startOffset = 100 + rand() * 80
      const startX = Math.cos(rad) * startOffset
      const startY = Math.sin(rad) * startOffset
      const driftX = Math.cos(rad) * layer.driftMag
      const driftY = Math.sin(rad) * layer.driftMag
      const w      = layer.imgWidth
      const format = globalIdx % 3
      const height = format === 0 ? Math.round(w * 1.5) : format === 1 ? w : Math.round(w * 0.7)
      const delay  = -(rand() * layer.duration)
      cards.push({
        id: `l${li}-a${ai}`,
        startX, startY, driftX, driftY,
        width: w, height, format,
        duration:   layer.duration,
        delay,
        maxOpacity: layer.maxOpacity,
        zIndex:     layer.zIdx,
      })
      globalIdx++
    })
  })
  return cards
}

// ─── Constantes de style ──────────────────────────────────────────────────────

const CREAM      = "#f5f1e8"
const BROWN      = "#8b7355"
const BROWN_DARK = "#6d5a40"
const TEXT_DARK  = "#3d2b1f"

// ─── Props ────────────────────────────────────────────────────────────────────

interface FloatingGalleryProps {
  apiUrl: string
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function FloatingGallery({ apiUrl }: FloatingGalleryProps) {
  const router = useRouter()
  const { user, userData, incrementSearchCount } = useAuth()

  // ── États galerie (inchangés) ─────────────────────────────────────────────
  const [items,       setItems]       = useState<LuminaireItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [cardItems,   setCardItems]   = useState<Record<string, string>>({})
  const queueRef    = useRef<string[]>([])
  const shuffleSeed = useRef(99)

  // ── États recherche ───────────────────────────────────────────────────────
  const [searchMode,    setSearchMode]    = useState<null | "text" | "image">(null)
  const [searchQuery,   setSearchQuery]   = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching,   setIsSearching]   = useState(false)
  const [searchError,   setSearchError]   = useState<string | null>(null)

  // ── États recherche image ─────────────────────────────────────────────────
  const [capturedImage,          setCapturedImage]          = useState<string | null>(null)
  const [selectedFile,           setSelectedFile]           = useState<File | null>(null)
  const [selectedImageForSearch, setSelectedImageForSearch] = useState<File | null>(null)
  const [isRemovingBackground,   setIsRemovingBackground]   = useState(false)
  const [backgroundRemovedImage, setBackgroundRemovedImage] = useState<string | null>(null)
  const [showBackgroundOptions,  setShowBackgroundOptions]  = useState(false)

  // ── États caméra ──────────────────────────────────────────────────────────
  const [isCameraActive,  setIsCameraActive]  = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [isCapturing,     setIsCapturing]     = useState(false)
  const [zoomLevel,       setZoomLevel]       = useState(1)

  // ── États UI ──────────────────────────────────────────────────────────────
  const [showLoginModal, setShowLoginModal] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef       = useRef<HTMLVideoElement>(null)
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch luminaires ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/luminaires?page=1&limit=100")
        const data = await res.json()
        if (data.success && data.luminaires?.length > 0) {
          const filtered: LuminaireItem[] = data.luminaires
            .filter((l: any) => l.filename && l._id)
            .map((l: any) => ({
              _id:      l._id,
              imageUrl: `/api/images/filename/${l.filename}`,
              nom:      l.nom || l["Nom luminaire"] || "",
              filename: l.filename,
            }))
          filtered.length > 0 ? setItems(filtered) : setError(true)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const cards      = useMemo(() => buildCards(), [])
  const itemsById  = useMemo(() => {
    const m = new Map<string, LuminaireItem>()
    items.forEach(i => m.set(i._id, i))
    return m
  }, [items])
  const allIds     = useMemo(() => items.map(i => i._id), [items])

  // Map filename → item pour processApiResults
  const itemsFilenameMap = useMemo(() => {
    const m = new Map<string, LuminaireItem>()
    items.forEach(item => {
      if (item.filename) m.set(item.filename.toLowerCase(), item)
    })
    return m
  }, [items])

  // ── Initialisation queue ──────────────────────────────────────────────────
  useEffect(() => {
    if (allIds.length === 0) return
    const shuffled = shuffleIds(allIds, shuffleSeed.current)
    queueRef.current = shuffled
    const initial: Record<string, string> = {}
    cards.forEach(card => {
      if (queueRef.current.length === 0) {
        shuffleSeed.current++
        queueRef.current = shuffleIds(allIds, shuffleSeed.current)
      }
      initial[card.id] = queueRef.current.shift()!
    })
    setCardItems(initial)
  }, [allIds, cards])

  const handleAnimationIteration = useCallback((cardId: string) => {
    if (queueRef.current.length === 0) {
      shuffleSeed.current++
      queueRef.current = shuffleIds(allIds, shuffleSeed.current)
    }
    const nextId = queueRef.current.shift()!
    setCardItems(prev => ({ ...prev, [cardId]: nextId }))
  }, [allIds])

  // ── Focus auto sur l'input texte ──────────────────────────────────────────
  useEffect(() => {
    if (searchMode === "text") {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [searchMode])

  // ── Nettoyage caméra au démontage ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop())
      }
      if (backgroundRemovedImage) URL.revokeObjectURL(backgroundRemovedImage)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fonctions recherche ──────────────────────────────────────────────────

  function processApiResults(apiResults: any[]): SearchResult[] {
    return apiResults.map((result, index) => {
      const rawId   = String(result.image_id || `result_${index}`)
      const cleanId = rawId.split("#")[0].split("?")[0]
      const noExt   = cleanId.replace(/\.[^/.]+$/, "")

      const localMatch = itemsFilenameMap.get(cleanId.toLowerCase())
        ?? itemsFilenameMap.get(noExt.toLowerCase())

      // Construction URL image
      let imageUrl = "/placeholder.svg"
      const raw    = String(result.image_url || "").trim()
      if (raw) {
        if (raw.startsWith("http://") || raw.startsWith("https://")) {
          imageUrl = raw.split("#")[0]
        } else if (raw.startsWith("/")) {
          imageUrl = `https://image-similarity-api-590690354412.us-central1.run.app${raw.split("#")[0]}`
        } else {
          imageUrl = `https://image-similarity-api-590690354412.us-central1.run.app/images/${raw.split("#")[0]}`
        }
      }

      return {
        imageId:       cleanId,
        imageUrl:      localMatch ? `/api/images/filename/${localMatch.filename}` : imageUrl,
        luminaireUrl:  localMatch ? `/luminaires/${localMatch._id}` : null,
        nom:           localMatch?.nom || cleanId,
        similarity:    result.similarity ?? null,
        hasLocalMatch: !!localMatch,
      }
    })
  }

  async function callImageSimilarityAPI(file: File) {
    const formData = new FormData()
    formData.append("image", file)
    formData.append("top_k", "10")
    const response = await fetch(apiUrl, {
      method: "POST",
      body:   formData,
      headers: { Accept: "application/json" },
    })
    if (response.ok) {
      const json = await response.json()
      if (json.results && Array.isArray(json.results)) {
        return { success: true, data: json.results }
      }
    }
    return { success: false, data: [] }
  }

  async function handleImageSearch(file: File) {
    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche IA")
      setShowLoginModal(true)
      return
    }
    if (userData?.role === "free") {
      const canProceed = await incrementSearchCount()
      if (!canProceed) return
    }
    setIsSearching(true)
    setSearchError(null)
    setSearchResults([])
    try {
      const res = await callImageSimilarityAPI(file)
      if (res.success && res.data.length > 0) {
        const results = processApiResults(res.data)
        setSearchResults(results)
        if (results.length === 0) setSearchError("Aucun résultat trouvé")
        else if (userData?.role === "free") {
          const remaining = 3 - (userData.searchCount || 0)
          if (remaining <= 1) toast.warning(`Plus que ${remaining} recherche(s) restante(s) ce mois-ci`)
        }
      } else {
        setSearchError("Aucun résultat trouvé")
      }
    } catch {
      setSearchError("Erreur lors de la recherche")
    } finally {
      setIsSearching(false)
    }
  }

  async function handleTextSearch(query: string) {
    if (!query.trim()) return
    setIsSearching(true)
    setSearchError(null)
    setSearchResults([])
    try {
      const res  = await fetch(`/api/luminaires?search=${encodeURIComponent(query.trim())}&limit=20`)
      const data = await res.json()
      if (data.success && data.luminaires?.length > 0) {
        const results: SearchResult[] = data.luminaires
          .filter((l: any) => l.filename && l._id)
          .map((l: any) => ({
            imageId:       l.filename,
            imageUrl:      `/api/images/filename/${l.filename}`,
            luminaireUrl:  `/luminaires/${l._id}`,
            nom:           l.nom || l["Nom luminaire"] || l.filename,
            similarity:    null,
            hasLocalMatch: true,
          }))
        setSearchResults(results)
      } else {
        setSearchError("Aucun résultat trouvé")
      }
    } catch {
      setSearchError("Erreur lors de la recherche")
    } finally {
      setIsSearching(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setSelectedImageForSearch(file)
    setCapturedImage(URL.createObjectURL(file))
    setShowBackgroundOptions(true)
    e.target.value = ""
  }

  async function handleCameraCapture() {
    if (!user) {
      toast.error("Connexion requise")
      setShowLoginModal(true)
      return
    }

    // P1 — Guard disponibilité API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSearchError("Caméra non disponible sur cet appareil")
      return
    }

    setIsCameraLoading(true)
    // Nettoyer tout flux existant
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, frameRate: { ideal: 30 } },
        audio: false,
      })
      cameraStreamRef.current = stream

      // P0 — Ordre correct : setActive AVANT d'attacher, puis setTimeout
      setIsCameraActive(true)
      setIsCameraLoading(false)
      setZoomLevel(1)

      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(console.error)
        }
      }, 100)
    } catch (err: any) {
      // P1 — 5 types d'erreurs nommées
      let msg = "Erreur caméra"
      if (err.name === "NotAllowedError")       msg = "Accès caméra refusé"
      else if (err.name === "NotFoundError")    msg = "Aucune caméra détectée"
      else if (err.name === "NotReadableError") msg = "Caméra déjà utilisée"
      else if (err.name === "OverconstrainedError") {
        // Retry sans contraintes avancées
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          cameraStreamRef.current = stream
          setIsCameraActive(true)
          setIsCameraLoading(false)
          setZoomLevel(1)
          setTimeout(() => {
            if (videoRef.current && stream) {
              videoRef.current.srcObject = stream
              videoRef.current.play().catch(console.error)
            }
          }, 100)
          return
        } catch {
          msg = "Contraintes caméra non supportées"
        }
      } else if (err.message) {
        msg = "Erreur caméra : " + err.message
      }
      setSearchError(msg)
      setIsCameraLoading(false)
    }
  }

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop())
    cameraStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraActive(false)
    setIsCameraLoading(false)
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    setIsCapturing(true)
    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    stopCamera()
    canvas.toBlob(blob => {
      if (!blob) { setIsCapturing(false); return }
      const file = new File([blob], "capture.jpg", { type: "image/jpeg", lastModified: Date.now() })
      const url  = URL.createObjectURL(blob)
      setSelectedFile(file)
      setSelectedImageForSearch(file)
      setCapturedImage(url)
      setShowBackgroundOptions(true)
      setIsCapturing(false)
    }, "image/jpeg", 0.9)
  }

  async function handleRemoveBackground(file: File) {
    setIsRemovingBackground(true)
    try {
      const formData = new FormData()
      formData.append("image_file", file)
      formData.append("size", "auto")
      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method:  "POST",
        headers: { "X-Api-Key": "CxDYnAaszk34fhCYLBDBikZp" },
        body:    formData,
      })
      if (response.ok) {
        const blob = await response.blob()
        const url  = URL.createObjectURL(blob)
        if (backgroundRemovedImage) URL.revokeObjectURL(backgroundRemovedImage)
        setBackgroundRemovedImage(url)
        setCapturedImage(url)
        const pngFile = new File([blob], `${file.name.split(".")[0]}_no_bg.png`, {
          type: "image/png", lastModified: Date.now(),
        })
        setSelectedImageForSearch(pngFile)
        toast.success("Arrière-plan supprimé !")
        return pngFile
      } else {
        const errorText = await response.text()
        console.error("remove.bg error:", errorText)
        setSearchError("Erreur suppression arrière-plan (crédits épuisés ?)")
        return null
      }
    } catch {
      toast.error("Erreur lors de la suppression d'arrière-plan")
    } finally {
      setIsRemovingBackground(false)
    }
    return null
  }

  function resetImageSearch() {
    stopCamera()
    if (capturedImage && !backgroundRemovedImage) URL.revokeObjectURL(capturedImage)
    if (backgroundRemovedImage) { URL.revokeObjectURL(backgroundRemovedImage); setBackgroundRemovedImage(null) }
    setCapturedImage(null)
    setSelectedFile(null)
    setSelectedImageForSearch(null)
    setShowBackgroundOptions(false)
    setZoomLevel(1)
  }

  function resetSearch() {
    setSearchMode(null)
    setSearchQuery("")
    setSearchResults([])
    setSearchError(null)
    setIsSearching(false)
    resetImageSearch()
  }

  // ── États intermédiaires ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ width: "100%", height: "100vh", background: CREAM,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: '"Playfair Display", Georgia, serif', color: BROWN, fontSize: "1.1rem" }}>
          Chargement…
        </p>
      </div>
    )
  }

  if (error || items.length === 0) {
    return (
      <div style={{ width: "100%", height: "100vh", background: CREAM,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', color: TEXT_DARK,
                       fontSize: "2.5rem", marginBottom: "1.5rem" }}>
            Nos Luminaires
          </h2>
          <Link href="/luminaires" style={{
            display: "inline-block", padding: "0.75rem 2rem",
            background: BROWN, color: "#fff", borderRadius: "8px",
            fontFamily: "system-ui, sans-serif", fontSize: "0.95rem",
            fontWeight: 500, textDecoration: "none",
          }}>
            Découvrir la collection →
          </Link>
        </div>
      </div>
    )
  }

  // ── Rendu principal ────────────────────────────────────────────────────────

  return (
    <>
      <style>{`

        /* ── Animation dérive ── */
        @keyframes fg-drift {
          0%   { transform: translate(0px, 0px) scale(0.9); opacity: 0; }
          10%  { transform: translate(calc(var(--tx)*0.10), calc(var(--ty)*0.10)) scale(1.0); opacity: var(--op); }
          85%  { transform: translate(calc(var(--tx)*0.85), calc(var(--ty)*0.85)) scale(0.975); opacity: var(--op); }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.95); opacity: 0; }
        }

        /* ── Slide-in pour zone de recherche ── */
        @keyframes fg-slidein {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Carte animée (wrapper) ── */
        .fg-card {
          position: absolute;
          animation-name: fg-drift;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-fill-mode: both;
          will-change: transform, opacity;
        }

        /* ── Couche visuelle (hover scale isolé) ── */
        .fg-inner {
          width: 100%; height: 100%;
          border-radius: 14px; overflow: hidden;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transform: scale(1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .fg-inner:hover { transform: scale(1.04); box-shadow: 0 8px 28px rgba(0,0,0,0.14); }
        .fg-inner img   { width:100%; height:100%; object-fit:cover; display:block;
                          pointer-events:none; user-select:none; -webkit-user-drag:none; }

        /* ── Fades 4 bords ── */
        .fg-fade { position:absolute; pointer-events:none; z-index:10; }
        .fg-fade-top    { top:0;    left:0; right:0;  height:18%; background:linear-gradient(to bottom,${CREAM} 0%,transparent 100%); }
        .fg-fade-bottom { bottom:0; left:0; right:0;  height:18%; background:linear-gradient(to top,   ${CREAM} 0%,transparent 100%); }
        .fg-fade-left   { left:0;   top:0;  bottom:0; width:18%;  background:linear-gradient(to right, ${CREAM} 0%,transparent 100%); }
        .fg-fade-right  { right:0;  top:0;  bottom:0; width:18%;  background:linear-gradient(to left,  ${CREAM} 0%,transparent 100%); }

        /* ── Overlay central ── */
        .fg-center {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 20; text-align: center;
          padding: 2rem 3rem;
          border-radius: 20px;
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          background: rgba(245,241,232,0.60);
          min-width: 340px;
        }
        .fg-title {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 2.2rem; font-weight: 600;
          color: ${TEXT_DARK}; letter-spacing: -0.02em;
          margin: 0 0 0.35rem 0; white-space: nowrap;
        }
        .fg-subtitle {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.78rem; color: #7a6654;
          margin: 0 0 1.25rem 0; letter-spacing: 0.08em; text-transform: uppercase;
        }

        /* ── Boutons pill principaux ── */
        .fg-pill-btn {
          background: transparent;
          border: 1.5px solid ${BROWN};
          color: ${BROWN};
          border-radius: 50px;
          padding: 0.6rem 1.5rem;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.25s ease;
          font-family: system-ui, -apple-system, sans-serif;
          white-space: nowrap;
          line-height: 1.2;
        }
        .fg-pill-btn:hover, .fg-pill-btn.fg-active {
          background: ${BROWN}; color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(139,115,85,0.35);
        }

        /* ── Boutons pill secondaires (sous-actions) ── */
        .fg-pill-sm {
          background: transparent;
          border: 1.5px solid ${BROWN};
          color: ${BROWN};
          border-radius: 50px;
          padding: 0.38rem 0.9rem;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: system-ui, -apple-system, sans-serif;
          white-space: nowrap;
        }
        .fg-pill-sm:hover, .fg-pill-sm.fg-active {
          background: ${BROWN}; color: #fff;
        }
        .fg-pill-sm:disabled {
          opacity: 0.45; cursor: not-allowed; transform: none !important;
        }

        /* ── Zone de recherche animée ── */
        .fg-search-zone {
          animation: fg-slidein 0.22s ease-out;
          margin-top: 1rem;
        }

        /* ── Input texte pill ── */
        .fg-text-wrap { position: relative; display: inline-flex; align-items: center; }
        .fg-text-input {
          background: rgba(255,255,255,0.90);
          border: 1px solid #d4c9b8;
          border-radius: 50px;
          padding: 0.65rem 3rem 0.65rem 1.2rem;
          width: 280px;
          font-size: 0.88rem;
          font-family: system-ui, -apple-system, sans-serif;
          color: ${TEXT_DARK};
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .fg-text-input:focus {
          border-color: ${BROWN};
          box-shadow: 0 0 0 3px rgba(139,115,85,0.12);
        }
        .fg-text-input::placeholder { color: #b0a090; }
        .fg-input-btn {
          position: absolute; right: 6px;
          background: ${BROWN}; color: #fff;
          border: none; border-radius: 50px;
          width: 32px; height: 32px;
          font-size: 1rem; cursor: pointer;
          transition: background 0.2s ease;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .fg-input-btn:hover { background: ${BROWN_DARK}; }
        .fg-input-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Lien "Voir tous" ── */
        .fg-see-all {
          display: inline-block; margin-top: 1.1rem;
          font-family: system-ui, sans-serif;
          font-size: 0.76rem; color: ${BROWN};
          text-decoration: none; opacity: 0.75;
          transition: opacity 0.2s;
        }
        .fg-see-all:hover { opacity: 1; text-decoration: underline; }

        /* ── Panneau résultats ── */
        .fg-results {
          position: absolute;
          bottom: 1.5rem; left: 50%; transform: translateX(-50%);
          z-index: 30;
          width: 88vw; max-width: 860px;
          background: rgba(245,241,232,0.94);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          border-radius: 18px;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 8px 40px rgba(0,0,0,0.12);
          max-height: 42vh; overflow-y: auto;
          animation: fg-slidein 0.25s ease-out;
        }
        .fg-results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
          margin-top: 0.75rem;
        }
        .fg-result-card { max-width: 130px; transition: transform 0.2s ease; cursor: pointer; }
        .fg-result-card:hover { transform: scale(1.03); }
        .fg-result-card img {
          width: 100%; aspect-ratio: 3/4; object-fit: cover;
          border-radius: 10px; display: block;
        }
        .fg-result-card p {
          font-size: 0.7rem; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
        }

        /* ── Bouton fermer ── */
        .fg-close-btn {
          background: transparent;
          border: 1px solid ${BROWN}; color: ${BROWN};
          border-radius: 50%; width: 28px; height: 28px;
          font-size: 0.78rem; cursor: pointer;
          transition: all 0.2s;
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .fg-close-btn:hover { background: ${BROWN}; color: #fff; }

        /* ── Spinner ── */
        .fg-spinner {
          width: 20px; height: 20px;
          border: 2.5px solid rgba(139,115,85,0.25);
          border-top-color: ${BROWN};
          border-radius: 50%;
          animation: fg-spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes fg-spin { to { transform: rotate(360deg); } }

        /* ── Responsive ── */
        @media (max-width: 767px) {
          .fg-center     { padding: 1.5rem 1.75rem; min-width: 280px; }
          .fg-title      { font-size: 1.6rem; white-space: normal; }
          .fg-text-input { width: 220px; }
          .fg-fade-top, .fg-fade-bottom { height: 12%; }
          .fg-fade-left, .fg-fade-right { width: 10%; }
          .fg-results    { width: 94vw; padding: 1rem; }
          .fg-results-grid { grid-template-columns: repeat(auto-fill, minmax(120px,1fr)); gap: 8px; }
        }
      `}</style>

      <section style={{
        width: "100%", height: "100vh",
        position: "relative", overflow: "hidden",
        background: CREAM,
      }}>

        {/* ── 24 cartes dérivantes ── */}
        {cards.map(card => {
          const itemId   = cardItems[card.id]
          const item     = itemId ? itemsById.get(itemId) : undefined
          if (!item) return null
          const isPaused = hoveredCard === card.id
          return (
            <div
              key={card.id}
              className="fg-card"
              style={{
                left:              `calc(50% + ${card.startX}px)`,
                top:               `calc(50% + ${card.startY}px)`,
                width:             `${card.width}px`,
                height:            `${card.height}px`,
                marginLeft:        `${-card.width  / 2}px`,
                marginTop:         `${-card.height / 2}px`,
                zIndex:            card.zIndex,
                "--tx":            `${card.driftX}px`,
                "--ty":            `${card.driftY}px`,
                "--op":            String(card.maxOpacity),
                animationDuration: `${card.duration}s`,
                animationDelay:    `${card.delay}s`,
                animationPlayState: isPaused ? "paused" : "running",
              } as React.CSSProperties}
              onAnimationIteration={() => handleAnimationIteration(card.id)}
            >
              <div
                className="fg-inner"
                onClick={() => router.push(`/luminaires/${item._id}`)}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                title={item.nom || undefined}
              >
                <img src={item.imageUrl} alt={item.nom || "Luminaire"} loading="lazy" draggable={false} />
              </div>
            </div>
          )
        })}

        {/* ── Fades 4 bords ── */}
        <div className="fg-fade fg-fade-top"    />
        <div className="fg-fade fg-fade-bottom" />
        <div className="fg-fade fg-fade-left"   />
        <div className="fg-fade fg-fade-right"  />

        {/* ── Overlay central ── */}
        <div className="fg-center">

          <h2 className="fg-title">Nos Luminaires</h2>
          <p  className="fg-subtitle">Du Moyen-Âge à nos jours</p>

          {/* Deux boutons pill */}
          <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className={`fg-pill-btn${searchMode === "text"  ? " fg-active" : ""}`}
              onClick={() => { resetSearch(); if (searchMode !== "text")  setSearchMode("text")  }}
            >
              🔍 Recherche texte
            </button>
            <button
              className={`fg-pill-btn${searchMode === "image" ? " fg-active" : ""}`}
              onClick={() => { resetSearch(); if (searchMode !== "image") setSearchMode("image") }}
            >
              📷 Par image
            </button>
          </div>

          {/* ── Zone recherche TEXTE ── */}
          {searchMode === "text" && (
            <div className="fg-search-zone">
              <div className="fg-text-wrap">
                <input
                  ref={searchInputRef}
                  className="fg-text-input"
                  placeholder="Nom, designer, époque, matière…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleTextSearch(searchQuery) }}
                />
                <button
                  className="fg-input-btn"
                  onClick={() => handleTextSearch(searchQuery)}
                  disabled={isSearching || !searchQuery.trim()}
                  aria-label="Rechercher"
                >
                  {isSearching ? <span className="fg-spinner" /> : "→"}
                </button>
              </div>
            </div>
          )}

          {/* ── Zone recherche IMAGE ── */}
          {searchMode === "image" && (
            <div className="fg-search-zone">

              {/* Sous-boutons si pas encore d'image ni caméra */}
              {!capturedImage && !isCameraActive && !isCameraLoading && (
                <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="fg-pill-sm" onClick={() => fileInputRef.current?.click()}>
                    📁 Uploader
                  </button>
                  <button className="fg-pill-sm" onClick={handleCameraCapture}>
                    📸 Caméra
                  </button>
                </div>
              )}

              {/* Caméra en cours d'activation */}
              {isCameraLoading && (
                <p style={{ fontSize: "0.82rem", color: BROWN, margin: 0 }}>
                  <span className="fg-spinner" style={{ marginRight: "0.4rem" }} />
                  Activation caméra…
                </p>
              )}

              {/* Caméra active — flux vidéo */}
              {isCameraActive && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.6rem" }}>
                  {/* P3 — conteneur overflow hidden pour isoler le zoom CSS */}
                  <div style={{ width:"200px", height:"150px", borderRadius:"12px", overflow:"hidden" }}>
                    <video
                      ref={videoRef}
                      autoPlay playsInline muted
                      style={{
                        width: "100%", height: "100%",
                        objectFit: "cover", display: "block",
                        transform: `scale(${zoomLevel})`, transformOrigin: "center",
                      }}
                    />
                  </div>
                  <input
                    type="range" min={1} max={3} step={0.1}
                    value={zoomLevel}
                    onChange={e => setZoomLevel(Number(e.target.value))}
                    style={{ width: "110px", accentColor: BROWN }}
                    aria-label="Zoom"
                  />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="fg-pill-sm fg-active" onClick={capturePhoto} disabled={isCapturing}>
                      {isCapturing ? <span className="fg-spinner" /> : "Capturer"}
                    </button>
                    <button className="fg-pill-sm" onClick={() => { stopCamera(); }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Preview image + actions */}
              {capturedImage && !isCameraActive && (
                <div style={{ display:"flex", alignItems:"center", gap:"0.6rem",
                              justifyContent:"center", flexWrap:"wrap" }}>
                  <img
                    src={capturedImage}
                    alt="Aperçu"
                    style={{ width:"56px", height:"56px", borderRadius:"10px", objectFit:"cover", flexShrink:0 }}
                  />
                  <span style={{ fontSize:"0.72rem", color:"#7a6654", maxWidth:"90px",
                                 overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {selectedFile?.name || "image"}
                  </span>
                  <button className="fg-pill-sm" onClick={resetImageSearch} title="Annuler">✕</button>
                  {!backgroundRemovedImage && (
                    <button
                      className="fg-pill-sm"
                      onClick={() => selectedImageForSearch && handleRemoveBackground(selectedImageForSearch)}
                      disabled={isRemovingBackground}
                    >
                      {isRemovingBackground ? <span className="fg-spinner" /> : "Supprimer fond"}
                    </button>
                  )}
                  <button
                    className="fg-pill-sm fg-active"
                    onClick={() => selectedImageForSearch && handleImageSearch(selectedImageForSearch)}
                    disabled={isSearching}
                  >
                    {isSearching ? <span className="fg-spinner" /> : "Analyser →"}
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Lien discret */}
          <Link href="/luminaires" className="fg-see-all">
            Voir tous les luminaires →
          </Link>

        </div>
        {/* ── Fin overlay central ── */}

        {/* ── Panneau résultats ── */}
        {(searchResults.length > 0 || (searchError && searchMode !== null) || (isSearching && searchMode !== null)) && (
          <div className="fg-results">

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.5rem" }}>
              <span style={{ fontFamily:'"Playfair Display", serif', color:TEXT_DARK,
                             fontWeight:600, fontSize:"0.95rem" }}>
                {isSearching
                  ? "Recherche en cours…"
                  : searchError
                    ? "Résultats"
                    : `${searchResults.length} résultat${searchResults.length > 1 ? "s" : ""} trouvé${searchResults.length > 1 ? "s" : ""}`}
              </span>
              <button
                className="fg-close-btn"
                onClick={() => { setSearchResults([]); setSearchError(null); setIsSearching(false) }}
                title="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Spinner */}
            {isSearching && (
              <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
                <span className="fg-spinner" style={{ width:"28px", height:"28px", borderWidth:"3px" }} />
              </div>
            )}

            {/* Erreur */}
            {searchError && !isSearching && (
              <p style={{ color:"#c0392b", fontSize:"0.85rem", textAlign:"center", margin:"0.5rem 0" }}>
                {searchError}
              </p>
            )}

            {/* Grille */}
            {!isSearching && searchResults.length > 0 && (
              <div className="fg-results-grid">
                {searchResults.map((result, i) => (
                  <div
                    key={i}
                    className="fg-result-card"
                    title={result.nom || ""}
                    onClick={() => {
                      if (result.luminaireUrl) router.push(result.luminaireUrl)
                      else if ((result as any)._id) router.push(`/luminaires/${(result as any)._id}`)
                      else if ((result as any).image_id) router.push(`/luminaires/${(result as any).image_id}`)
                    }}
                  >
                    <img
                      src={result.imageUrl}
                      alt={result.nom}
                      onError={e => { e.currentTarget.src = "/placeholder.svg" }}
                    />
                    <p style={{ color:TEXT_DARK, margin:"0.3rem 0 0" }}>
                      {result.nom}
                    </p>
                    {result.similarity !== null && (
                      <p style={{ fontSize:"0.65rem", color:BROWN, margin:"0.1rem 0 0" }}>
                        {Math.round(result.similarity * 100)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ── Éléments cachés ── */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <input
          ref={fileInputRef}
          type="file" accept="image/*"
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />

      </section>

      {/* Modal login */}
      {showLoginModal && (
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      )}
    </>
  )
}
