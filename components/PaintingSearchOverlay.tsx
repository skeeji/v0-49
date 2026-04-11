"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  imageId:       string
  imageUrl:      string
  luminaireUrl:  string | null
  nom:           string
  similarity:    number | null
  hasLocalMatch: boolean
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SIMILARITY_API = "https://image-similarity-api-590690354412.us-central1.run.app/search"
const CREAM          = "#f5f1e8"
const BROWN          = "#8b7355"
const BROWN_DARK     = "#6d5a40"
const TEXT_DARK      = "#3d2b1f"

// ─── Composant ────────────────────────────────────────────────────────────────

export function PaintingSearchOverlay() {
  const router = useRouter()
  const { user, userData, incrementSearchCount } = useAuth()

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

  // ── États caméra ──────────────────────────────────────────────────────────
  const [isCameraActive,  setIsCameraActive]  = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [isCapturing,     setIsCapturing]     = useState(false)
  const [zoomLevel,       setZoomLevel]       = useState(1)

  // ── États UI ──────────────────────────────────────────────────────────────
  const [showLoginModal, setShowLoginModal] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef        = useRef<HTMLVideoElement>(null)
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const searchInputRef  = useRef<HTMLInputElement>(null)
  const allItemsMapRef  = useRef<Map<string, any> | null>(null)

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

  async function buildFullMap() {
    if (allItemsMapRef.current) return
    const res1  = await fetch("/api/luminaires?page=1&limit=100")
    const data1 = await res1.json()
    if (!data1.success) return
    const total = data1.pagination?.total || 0
    const all   = [...data1.luminaires]
    if (total > 100) {
      const totalPages = Math.ceil(total / 100)
      const promises   = []
      for (let p = 2; p <= totalPages; p++) {
        promises.push(
          fetch(`/api/luminaires?page=${p}&limit=100`)
            .then(r => r.json())
            .then(d => d.success ? d.luminaires : [])
        )
      }
      const pages = await Promise.all(promises)
      pages.forEach(p => all.push(...p))
    }
    const map = new Map<string, any>()
    all.filter((l: any) => l.filename && l._id)
       .forEach((l: any) => {
         map.set(l.filename, l)
         map.set(l.filename.toLowerCase(), l)
         map.set(l.filename.replace(/\.[^/.]+$/, ""), l)
         map.set(l.filename.toLowerCase().replace(/\.[^/.]+$/, ""), l)
       })
    allItemsMapRef.current = map
  }

  function processApiResults(apiResults: any[]): SearchResult[] {
    const map = allItemsMapRef.current
    if (!map) return []
    return apiResults.map((result, index) => {
      const rawId   = String(result.image_id || `result_${index}`)
      const cleanId = rawId.split("#")[0].split("?")[0].trim()
      const localMatch =
        map.get(cleanId) ||
        map.get(cleanId.toLowerCase()) ||
        map.get(cleanId.replace(/\.[^/.]+$/, "")) ||
        map.get(cleanId.toLowerCase().replace(/\.[^/.]+$/, "")) ||
        null
      let externalUrl = "/placeholder.svg"
      const raw = String(result.image_url || "").trim()
      if (raw) {
        if (raw.startsWith("http://") || raw.startsWith("https://")) {
          externalUrl = raw.split("#")[0]
        } else if (raw.startsWith("/")) {
          externalUrl = `https://image-similarity-api-590690354412.us-central1.run.app${raw.split("#")[0]}`
        } else {
          externalUrl = `https://image-similarity-api-590690354412.us-central1.run.app/images/${raw.split("#")[0]}`
        }
      }
      return {
        imageId:       cleanId,
        imageUrl:      localMatch ? `/api/images/filename/${localMatch.filename}` : externalUrl,
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
    const response = await fetch(SIMILARITY_API, {
      method:  "POST",
      body:    formData,
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
      const [res] = await Promise.all([callImageSimilarityAPI(file), buildFullMap()])
      if (res.success && res.data.length > 0) {
        const results = processApiResults(res.data)
        setSearchResults(results)
        if (results.length === 0) setSearchError("Aucun résultat trouvé")
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
    e.target.value = ""
  }

  async function handleCameraCapture() {
    if (!user) {
      toast.error("Connexion requise")
      setShowLoginModal(true)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setSearchError("Caméra non disponible sur cet appareil")
      return
    }
    setIsCameraLoading(true)
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
      let msg = "Erreur caméra"
      if      (err.name === "NotAllowedError")  msg = "Accès caméra refusé"
      else if (err.name === "NotFoundError")    msg = "Aucune caméra détectée"
      else if (err.name === "NotReadableError") msg = "Caméra déjà utilisée"
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
      setSelectedFile(file)
      setSelectedImageForSearch(file)
      setCapturedImage(URL.createObjectURL(blob))
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
        setSearchError("Erreur suppression arrière-plan")
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

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes pso-slidein {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pso-center {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 20; text-align: center;
          padding: 2rem 3rem;
          border-radius: 20px;
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          background: rgba(245,241,232,0.60);
          min-width: 340px;
          pointer-events: auto;
        }
        .pso-title {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 2.2rem; font-weight: 600;
          color: ${TEXT_DARK}; letter-spacing: -0.02em;
          margin: 0 0 0.35rem 0; white-space: nowrap;
        }
        .pso-subtitle {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.78rem; color: #7a6654;
          margin: 0 0 1.25rem 0; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .pso-pill-btn {
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
        .pso-pill-btn:hover, .pso-pill-btn.pso-active {
          background: ${BROWN}; color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(139,115,85,0.35);
        }
        .pso-pill-sm {
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
        .pso-pill-sm:hover, .pso-pill-sm.pso-active { background: ${BROWN}; color: #fff; }
        .pso-pill-sm:disabled { opacity: 0.45; cursor: not-allowed; }
        .pso-search-zone { animation: pso-slidein 0.22s ease-out; margin-top: 1rem; }
        .pso-text-wrap { position: relative; display: inline-flex; align-items: center; }
        .pso-text-input {
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
        .pso-text-input:focus { border-color: ${BROWN}; box-shadow: 0 0 0 3px rgba(139,115,85,0.12); }
        .pso-text-input::placeholder { color: #b0a090; }
        .pso-input-btn {
          position: absolute; right: 6px;
          background: ${BROWN}; color: #fff;
          border: none; border-radius: 50px;
          width: 32px; height: 32px;
          font-size: 1rem; cursor: pointer;
          transition: background 0.2s ease;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .pso-input-btn:hover { background: ${BROWN_DARK}; }
        .pso-input-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .pso-see-all {
          display: inline-block; margin-top: 1.1rem;
          font-family: system-ui, sans-serif;
          font-size: 0.76rem; color: ${BROWN};
          text-decoration: none; opacity: 0.75;
          transition: opacity 0.2s;
        }
        .pso-see-all:hover { opacity: 1; text-decoration: underline; }
        .pso-results {
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
          animation: pso-slidein 0.25s ease-out;
          pointer-events: auto;
        }
        .pso-results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px; margin-top: 0.75rem;
        }
        .pso-result-card { max-width: 130px; transition: transform 0.2s ease; cursor: pointer; }
        .pso-result-card:hover { transform: scale(1.03); }
        .pso-result-card img { width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: 10px; display: block; }
        .pso-result-card p { font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pso-close-btn {
          background: transparent;
          border: 1px solid ${BROWN}; color: ${BROWN};
          border-radius: 50%; width: 28px; height: 28px;
          font-size: 0.78rem; cursor: pointer;
          transition: all 0.2s;
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .pso-close-btn:hover { background: ${BROWN}; color: #fff; }
        .pso-spinner {
          width: 20px; height: 20px;
          border: 2.5px solid rgba(139,115,85,0.25);
          border-top-color: ${BROWN};
          border-radius: 50%;
          animation: pso-spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes pso-spin { to { transform: rotate(360deg); } }
        @media (max-width: 767px) {
          .pso-center { padding: 1.5rem 1.75rem; min-width: 280px; }
          .pso-title  { font-size: 1.6rem; white-space: normal; }
          .pso-text-input { width: 220px; }
          .pso-results { width: 94vw; padding: 1rem; }
          .pso-results-grid { grid-template-columns: repeat(auto-fill, minmax(100px,1fr)); gap: 8px; }
        }
      `}</style>

      {/* ── Overlay central ── */}
      <div className="pso-center">
        <h2 className="pso-title">Luminaires</h2>
        <p  className="pso-subtitle">Du Moyen-Âge à nos jours</p>

        <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            className={`pso-pill-btn${searchMode === "text"  ? " pso-active" : ""}`}
            onClick={() => { resetSearch(); if (searchMode !== "text") setSearchMode("text") }}
          >
            Recherche texte
          </button>
          <button
            className={`pso-pill-btn${searchMode === "image" ? " pso-active" : ""}`}
            onClick={() => { resetSearch(); if (searchMode !== "image") setSearchMode("image") }}
          >
            Par image
          </button>
        </div>

        {/* ── Zone recherche TEXTE ── */}
        {searchMode === "text" && (
          <div className="pso-search-zone">
            <div className="pso-text-wrap">
              <input
                ref={searchInputRef}
                className="pso-text-input"
                placeholder="Nom, designer, époque, matière…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleTextSearch(searchQuery) }}
              />
              <button
                className="pso-input-btn"
                onClick={() => handleTextSearch(searchQuery)}
                disabled={isSearching || !searchQuery.trim()}
                aria-label="Rechercher"
              >
                {isSearching ? <span className="pso-spinner" /> : "→"}
              </button>
            </div>
          </div>
        )}

        {/* ── Zone recherche IMAGE ── */}
        {searchMode === "image" && (
          <div className="pso-search-zone">

            {/* Sous-boutons si pas d'image ni caméra */}
            {!capturedImage && !isCameraActive && !isCameraLoading && (
              <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
                <button className="pso-pill-sm" onClick={() => fileInputRef.current?.click()}>
                  Uploader
                </button>
                <button className="pso-pill-sm" onClick={handleCameraCapture}>
                  Caméra
                </button>
              </div>
            )}

            {/* Caméra en cours d'activation */}
            {isCameraLoading && (
              <p style={{ fontSize: "0.82rem", color: BROWN, margin: 0 }}>
                <span className="pso-spinner" style={{ marginRight: "0.4rem" }} />
                Activation caméra…
              </p>
            )}

            {/* Caméra active */}
            {isCameraActive && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.6rem" }}>
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
                  <button className="pso-pill-sm pso-active" onClick={capturePhoto} disabled={isCapturing}>
                    {isCapturing ? <span className="pso-spinner" /> : "Capturer"}
                  </button>
                  <button className="pso-pill-sm" onClick={stopCamera}>Annuler</button>
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
                <button className="pso-close-btn" onClick={resetImageSearch} title="Annuler">✕</button>
                {!backgroundRemovedImage && (
                  <button
                    className="pso-pill-sm"
                    onClick={() => selectedImageForSearch && handleRemoveBackground(selectedImageForSearch)}
                    disabled={isRemovingBackground}
                  >
                    {isRemovingBackground ? <span className="pso-spinner" /> : "Supprimer fond"}
                  </button>
                )}
                <button
                  className="pso-pill-sm pso-active"
                  onClick={() => selectedImageForSearch && handleImageSearch(selectedImageForSearch)}
                  disabled={isSearching}
                >
                  {isSearching ? <span className="pso-spinner" /> : "Analyser →"}
                </button>
              </div>
            )}

          </div>
        )}

        <Link href="/recherche" className="pso-see-all">
          Rechercher un luminaire →
        </Link>
      </div>

      {/* ── Panneau résultats ── */}
      {(searchResults.length > 0 || (searchError && searchMode !== null) || (isSearching && searchMode !== null)) && (
        <div className="pso-results">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.5rem" }}>
            <span style={{ fontFamily:'"Playfair Display", serif', color:TEXT_DARK, fontWeight:600, fontSize:"0.95rem" }}>
              {isSearching
                ? "Recherche en cours…"
                : searchError
                  ? "Résultats"
                  : `${searchResults.length} résultat${searchResults.length > 1 ? "s" : ""} trouvé${searchResults.length > 1 ? "s" : ""}`}
            </span>
            <button
              className="pso-close-btn"
              onClick={() => { setSearchResults([]); setSearchError(null); setIsSearching(false) }}
              title="Fermer"
            >✕</button>
          </div>
          {isSearching && (
            <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
              <span className="pso-spinner" style={{ width:"28px", height:"28px", borderWidth:"3px" }} />
            </div>
          )}
          {searchError && !isSearching && (
            <p style={{ color:"#c0392b", fontSize:"0.85rem", textAlign:"center", margin:"0.5rem 0" }}>
              {searchError}
            </p>
          )}
          {!isSearching && searchResults.length > 0 && (
            <div className="pso-results-grid">
              {searchResults.map((result, i) => (
                <div
                  key={i}
                  className="pso-result-card"
                  title={result.nom || ""}
                  onClick={() => { if (result.luminaireUrl) router.push(result.luminaireUrl) }}
                >
                  <img
                    src={result.imageUrl}
                    alt={result.nom}
                    onError={e => { e.currentTarget.src = "/placeholder.svg" }}
                  />
                  <p style={{ color:TEXT_DARK, margin:"0.3rem 0 0" }}>{result.nom}</p>
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

      {/* Éléments cachés */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <input
        ref={fileInputRef}
        type="file" accept="image/*"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      {showLoginModal && (
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      )}
    </>
  )
}
