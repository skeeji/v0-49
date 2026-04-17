"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

// ─── API (identiques à /recherche) ────────────────────────────────────────────

const API_TEXT  = "https://chatbot-984654216979.europe-west1.run.app/api/search_text"
const API_IMAGE = "https://image-similarity-api-590690354412.us-central1.run.app/api/search"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  imageId?:      string
  imageUrl?:     string
  luminaireUrl?: string | null
  luminaireId?:  string | null
  nom?:          string
  artiste?:      string
  annee?:        string | number
  similarity?:   number
  dimensions?:   string
}

// ─── Constantes de style ──────────────────────────────────────────────────────

const BROWN      = "#8b7355"
const BROWN_DARK = "#6d5a40"
const TEXT_DARK  = "#3d2b1f"

// ─── Enrichissement des résultats (identique à /recherche) ────────────────────

async function enrichTextResults(results: any[]): Promise<SearchResult[]> {
  return Promise.all(
    results.map(async (result) => {
      const luminaireId = result.luminaireId || result.luminaire_id
      let fileName = luminaireId?.split("/").pop()?.toLowerCase() || luminaireId
      if (!fileName && result.imageUrl) fileName = result.imageUrl.split("/").pop()?.toLowerCase() || ""
      if (!fileName && result.image_url) fileName = result.image_url.split("/").pop()?.toLowerCase() || ""

      let mongoId: string | null = null
      if (fileName) {
        try {
          const res  = await fetch(`/api/luminaire-by-image?filename=${encodeURIComponent(fileName)}`)
          const data = await res.json()
          if (data.success && data.found) {
            mongoId = data.luminaireId
            result.nom        = result.nom        || data.nom        || ""
            result.artiste    = result.artiste    || data.artiste    || ""
            result.annee      = result.annee      || data.annee      || ""
            result.dimensions = result.dimensions || data.dimensions || ""
          }
        } catch {}
      }

      const imageUrl = result.imageUrl || result.image_url || `/api/images/filename/${fileName}`
      return {
        imageUrl,
        luminaireUrl: mongoId ? `/luminaires/${mongoId}` : null,
        luminaireId:  mongoId,
        nom:          result.nom || "Sans nom",
        artiste:      result.artiste || "",
        annee:        result.annee !== null && result.annee !== "" ? String(result.annee) : "",
        similarity:   result.similarity || 0,
        dimensions:   result.dimensions || "",
      }
    })
  )
}

async function enrichImageResults(results: any[]): Promise<SearchResult[]> {
  return Promise.all(
    results.map(async (result) => {
      const imageId  = String(result.image_id || "").split("#")[0]
      const fileName = imageId.toLowerCase()

      let imageUrl = "/placeholder.svg"
      if (result.image_url) {
        const s = String(result.image_url).trim()
        imageUrl = s.startsWith("http")
          ? s.split("#")[0]
          : `https://image-similarity-api-590690354412.us-central1.run.app/images/${imageId}`
      }

      let luminaireId: string | null = null
      let nom = "", artiste = "", annee = "", dimensions = ""
      if (fileName) {
        try {
          const res  = await fetch(`/api/luminaire-by-image?filename=${encodeURIComponent(fileName)}`)
          const data = await res.json()
          if (data.success && data.found) {
            luminaireId = data.luminaireId
            nom         = data.nom        || ""
            artiste     = data.artiste    || ""
            annee       = data.annee      || ""
            dimensions  = data.dimensions || ""
            // si on a l'ID MongoDB, utiliser l'image locale
            if (luminaireId) imageUrl = `/api/images/filename/${fileName}`
          }
        } catch {}
      }

      return {
        imageId,
        imageUrl,
        luminaireUrl: luminaireId ? `/luminaires/${luminaireId}` : null,
        luminaireId,
        similarity:   result.similarity || 0,
        nom, artiste, annee, dimensions,
      }
    })
  )
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function PaintingSearchOverlay() {
  const router = useRouter()
  const { user, userData, incrementSearchCount } = useAuth()

  const [searchMode,    setSearchMode]    = useState<null | "text" | "image">(null)
  const [searchQuery,   setSearchQuery]   = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching,   setIsSearching]   = useState(false)
  const [searchError,   setSearchError]   = useState<string | null>(null)

  const [capturedImage,          setCapturedImage]          = useState<string | null>(null)
  const [selectedFile,           setSelectedFile]           = useState<File | null>(null)
  const [selectedImageForSearch, setSelectedImageForSearch] = useState<File | null>(null)
  const [isRemovingBackground,   setIsRemovingBackground]   = useState(false)
  const [backgroundRemovedImage, setBackgroundRemovedImage] = useState<string | null>(null)

  const [isCameraActive,  setIsCameraActive]  = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [isCapturing,     setIsCapturing]     = useState(false)
  const [zoomLevel,       setZoomLevel]       = useState(1)

  const [showLoginModal, setShowLoginModal] = useState(false)

  const videoRef        = useRef<HTMLVideoElement>(null)
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const searchInputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchMode === "text") setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [searchMode])

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach(t => t.stop())
      if (backgroundRemovedImage)  URL.revokeObjectURL(backgroundRemovedImage)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Recherche texte (chatbot API) ───────────────────────────────────────────

  async function handleTextSearch(query: string) {
    if (!query.trim()) return
    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche")
      setShowLoginModal(true)
      return
    }
    if (userData?.role === "free") {
      const ok = await incrementSearchCount()
      if (!ok) return
    }

    setIsSearching(true)
    setSearchError(null)
    setSearchResults([])

    try {
      const res = await fetch(API_TEXT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: query.trim(), top_k: 6 }),
      })
      if (!res.ok) throw new Error("Erreur API texte")

      let data: any
      const text = await res.text()
      try { data = JSON.parse(text) }
      catch { data = JSON.parse(text.replace(/:\s*NaN/g, ": null")) }

      if (data.results?.length > 0) {
        const enriched = await enrichTextResults(data.results)
        setSearchResults(enriched)
      } else {
        setSearchError("Aucun résultat trouvé")
      }
    } catch {
      setSearchError("Erreur lors de la recherche")
    } finally {
      setIsSearching(false)
    }
  }

  // ─── Recherche image (similarity API) ────────────────────────────────────────

  async function handleImageSearch(file: File) {
    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche IA")
      setShowLoginModal(true)
      return
    }
    if (userData?.role === "free") {
      const ok = await incrementSearchCount()
      if (!ok) return
    }

    setIsSearching(true)
    setSearchError(null)
    setSearchResults([])

    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("top_k", "6")

      const res = await fetch(API_IMAGE, { method: "POST", body: formData })
      if (!res.ok) throw new Error("Erreur API image")

      const data = await res.json()
      if (data.results?.length > 0) {
        const enriched = await enrichImageResults(data.results)
        setSearchResults(enriched)
      } else {
        setSearchError("Aucun résultat trouvé")
      }
    } catch {
      setSearchError("Erreur lors de la recherche par image")
    } finally {
      setIsSearching(false)
    }
  }

  // ─── Gestion fichier / caméra / background removal ───────────────────────────

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setSelectedImageForSearch(file)
    setCapturedImage(URL.createObjectURL(file))
    e.target.value = ""
  }

  async function handleCameraCapture() {
    if (!user) { toast.error("Connexion requise"); setShowLoginModal(true); return }
    if (!navigator.mediaDevices?.getUserMedia) { setSearchError("Caméra non disponible"); return }

    setIsCameraLoading(true)
    if (cameraStreamRef.current) { cameraStreamRef.current.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      cameraStreamRef.current = stream
      setIsCameraActive(true); setIsCameraLoading(false); setZoomLevel(1)
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(console.error) } }, 100)
    } catch (err: any) {
      const msg = err.name === "NotAllowedError" ? "Accès caméra refusé"
                : err.name === "NotFoundError"   ? "Aucune caméra détectée"
                : "Erreur caméra"
      setSearchError(msg); setIsCameraLoading(false)
    }
  }

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop())
    cameraStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraActive(false); setIsCameraLoading(false)
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    setIsCapturing(true)
    const video = videoRef.current; const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    stopCamera()
    canvas.toBlob(blob => {
      if (!blob) { setIsCapturing(false); return }
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" })
      setSelectedFile(file); setSelectedImageForSearch(file); setCapturedImage(URL.createObjectURL(blob))
      setIsCapturing(false)
    }, "image/jpeg", 0.9)
  }

  async function handleRemoveBackground(file: File) {
    setIsRemovingBackground(true)
    try {
      const formData = new FormData()
      formData.append("image_file", file); formData.append("size", "auto")
      const res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST", headers: { "X-Api-Key": "CxDYnAaszk34fhCYLBDBikZp" }, body: formData,
      })
      if (res.ok) {
        const blob = await res.blob(); const url = URL.createObjectURL(blob)
        if (backgroundRemovedImage) URL.revokeObjectURL(backgroundRemovedImage)
        setBackgroundRemovedImage(url); setCapturedImage(url)
        const pngFile = new File([blob], `${file.name.split(".")[0]}_no_bg.png`, { type: "image/png" })
        setSelectedImageForSearch(pngFile); toast.success("Arrière-plan supprimé !")
      } else {
        setSearchError("Erreur suppression arrière-plan")
      }
    } catch { toast.error("Erreur suppression arrière-plan") }
    finally { setIsRemovingBackground(false) }
  }

  function resetImageSearch() {
    stopCamera()
    if (capturedImage && !backgroundRemovedImage) URL.revokeObjectURL(capturedImage)
    if (backgroundRemovedImage) { URL.revokeObjectURL(backgroundRemovedImage); setBackgroundRemovedImage(null) }
    setCapturedImage(null); setSelectedFile(null); setSelectedImageForSearch(null); setZoomLevel(1)
  }

  function resetSearch() {
    setSearchMode(null); setSearchQuery(""); setSearchResults([]); setSearchError(null); setIsSearching(false)
    resetImageSearch()
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes pso-slidein { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .pso-center {
          position:absolute; top:28%; left:50%; transform:translate(-50%,-50%);
          z-index:20; text-align:center; padding:1.4rem 2.4rem; border-radius:16px;
          backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
          background:rgba(245,241,232,0.55); min-width:300px; pointer-events:auto;
          width:max-content; max-width:90vw;
        }
        .pso-title {
          font-family:"Playfair Display",Georgia,serif; font-size:1.7rem; font-weight:600;
          color:${TEXT_DARK}; letter-spacing:-0.02em; margin:0 0 0.2rem; white-space:nowrap;
        }
        .pso-subtitle {
          font-family:system-ui,-apple-system,sans-serif; font-size:0.7rem; color:#7a6654;
          margin:0 0 0.9rem; letter-spacing:0.08em; text-transform:uppercase;
        }
        .pso-pill-btn {
          background:transparent; border:1.5px solid ${BROWN}; color:${BROWN}; border-radius:50px;
          padding:0.45rem 1.15rem; font-size:0.78rem; cursor:pointer; transition:all 0.25s ease;
          font-family:system-ui,-apple-system,sans-serif; white-space:nowrap; line-height:1.2;
        }
        .pso-pill-btn:hover, .pso-pill-btn.pso-active {
          background:${BROWN}; color:#fff; transform:translateY(-2px);
          box-shadow:0 4px 16px rgba(139,115,85,0.35);
        }
        .pso-pill-sm {
          background:transparent; border:1.5px solid ${BROWN}; color:${BROWN}; border-radius:50px;
          padding:0.38rem 0.9rem; font-size:0.78rem; cursor:pointer; transition:all 0.2s ease;
          font-family:system-ui,-apple-system,sans-serif; white-space:nowrap;
        }
        .pso-pill-sm:hover, .pso-pill-sm.pso-active { background:${BROWN}; color:#fff; }
        .pso-pill-sm:disabled { opacity:0.45; cursor:not-allowed; }
        .pso-search-zone { animation:pso-slidein 0.22s ease-out; margin-top:1rem; }
        .pso-text-wrap { position:relative; display:inline-flex; align-items:center; }
        .pso-text-input {
          background:rgba(255,255,255,0.90); border:1px solid #d4c9b8; border-radius:50px;
          padding:0.55rem 3rem 0.55rem 1.1rem; width:240px; font-size:0.82rem;
          font-family:system-ui,-apple-system,sans-serif; color:${TEXT_DARK}; outline:none;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .pso-text-input:focus { border-color:${BROWN}; box-shadow:0 0 0 3px rgba(139,115,85,0.12); }
        .pso-text-input::placeholder { color:#b0a090; }
        .pso-input-btn {
          position:absolute; right:6px; background:${BROWN}; color:#fff; border:none; border-radius:50px;
          width:32px; height:32px; font-size:1rem; cursor:pointer; transition:background 0.2s;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .pso-input-btn:hover { background:${BROWN_DARK}; }
        .pso-input-btn:disabled { opacity:0.45; cursor:not-allowed; }
        .pso-see-all {
          display:inline-block; margin-top:0.7rem; font-family:system-ui,sans-serif;
          font-size:0.72rem; color:${BROWN}; text-decoration:none; opacity:0.75; transition:opacity 0.2s;
        }
        .pso-see-all:hover { opacity:1; text-decoration:underline; }
        .pso-results {
          position:absolute; bottom:1.5rem; left:50%; transform:translateX(-50%);
          z-index:30; width:min(88vw, 760px);
          background:rgba(245,241,232,0.96); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
          border-radius:18px; padding:1.25rem 1.5rem;
          box-shadow:0 8px 40px rgba(0,0,0,0.12); max-height:40vh; overflow-y:auto;
          animation:pso-slidein 0.25s ease-out; pointer-events:auto;
        }
        .pso-results-grid {
          display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:12px; margin-top:0.75rem;
        }
        .pso-result-card { transition:transform 0.2s ease; cursor:pointer; }
        .pso-result-card:hover { transform:scale(1.03); }
        .pso-result-card img { width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:10px; display:block; }
        .pso-result-card p { font-size:0.7rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:0.3rem 0 0; }
        .pso-close-btn {
          background:transparent; border:1px solid ${BROWN}; color:${BROWN}; border-radius:50%;
          width:28px; height:28px; font-size:0.78rem; cursor:pointer; transition:all 0.2s;
          display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .pso-close-btn:hover { background:${BROWN}; color:#fff; }
        .pso-spinner {
          width:20px; height:20px; border:2.5px solid rgba(139,115,85,0.25); border-top-color:${BROWN};
          border-radius:50%; animation:pso-spin 0.7s linear infinite; display:inline-block;
        }
        @keyframes pso-spin { to { transform:rotate(360deg); } }
        @media (max-width:640px) {
          .pso-center {
            padding:0.85rem 1.1rem;
            min-width:0; width:max-content; max-width:min(320px, 88vw);
            top:28%; left:50%;
            transform:translate(-50%,-50%);
          }
          .pso-title { font-size:1.1rem; white-space:nowrap; }
          .pso-subtitle { font-size:0.6rem; margin-bottom:0.6rem; }
          .pso-pill-btn { padding:0.35rem 0.8rem; font-size:0.7rem; }
          .pso-text-input { width:180px; font-size:0.78rem; }
          .pso-results {
            bottom:0.5rem;
            width:calc(100vw - 1.5rem);
            padding:0.75rem;
            max-height:35vh;
            border-radius:12px;
          }
          .pso-results-grid { grid-template-columns:repeat(auto-fill,minmax(80px,1fr)); gap:8px; }
        }
      `}</style>

      {/* ── Overlay central ── */}
      <div className="pso-center">
        <h2 className="pso-title">Luminaires</h2>
        <p  className="pso-subtitle">Du Moyen-Âge à nos jours</p>

        <div style={{ display:"flex", gap:"0.65rem", justifyContent:"center", flexWrap:"wrap" }}>
          <button
            className={`pso-pill-btn${searchMode === "text"  ? " pso-active" : ""}`}
            onClick={() => { resetSearch(); if (searchMode !== "text")  setSearchMode("text") }}
          >Recherche texte</button>
          <button
            className={`pso-pill-btn${searchMode === "image" ? " pso-active" : ""}`}
            onClick={() => { resetSearch(); if (searchMode !== "image") setSearchMode("image") }}
          >Par image</button>
        </div>

        {/* Zone recherche TEXTE */}
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
              >{isSearching ? <span className="pso-spinner" /> : "→"}</button>
            </div>
          </div>
        )}

        {/* Zone recherche IMAGE */}
        {searchMode === "image" && (
          <div className="pso-search-zone">

            {!capturedImage && !isCameraActive && !isCameraLoading && (
              <div style={{ display:"flex", gap:"0.6rem", justifyContent:"center", flexWrap:"wrap" }}>
                <button className="pso-pill-sm" onClick={() => fileInputRef.current?.click()}>Uploader</button>
                <button className="pso-pill-sm" onClick={handleCameraCapture}>Caméra</button>
              </div>
            )}

            {isCameraLoading && (
              <p style={{ fontSize:"0.82rem", color:BROWN, margin:0 }}>
                <span className="pso-spinner" style={{ marginRight:"0.4rem" }} />Activation caméra…
              </p>
            )}

            {isCameraActive && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.6rem" }}>
                <div style={{ width:"200px", height:"150px", borderRadius:"12px", overflow:"hidden" }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width:"100%", height:"100%", objectFit:"cover", transform:`scale(${zoomLevel})`, transformOrigin:"center" }} />
                </div>
                <input type="range" min={1} max={3} step={0.1} value={zoomLevel}
                  onChange={e => setZoomLevel(Number(e.target.value))}
                  style={{ width:"110px", accentColor:BROWN }} aria-label="Zoom" />
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button className="pso-pill-sm pso-active" onClick={capturePhoto} disabled={isCapturing}>
                    {isCapturing ? <span className="pso-spinner" /> : "Capturer"}
                  </button>
                  <button className="pso-pill-sm" onClick={stopCamera}>Annuler</button>
                </div>
              </div>
            )}

            {capturedImage && !isCameraActive && (
              <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", justifyContent:"center", flexWrap:"wrap" }}>
                <img src={capturedImage} alt="Aperçu"
                  style={{ width:"56px", height:"56px", borderRadius:"10px", objectFit:"cover", flexShrink:0 }} />
                <span style={{ fontSize:"0.72rem", color:"#7a6654", maxWidth:"90px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {selectedFile?.name || "image"}
                </span>
                <button className="pso-close-btn" onClick={resetImageSearch} title="Annuler">✕</button>
                {!backgroundRemovedImage && (
                  <button className="pso-pill-sm"
                    onClick={() => selectedImageForSearch && handleRemoveBackground(selectedImageForSearch)}
                    disabled={isRemovingBackground}>
                    {isRemovingBackground ? <span className="pso-spinner" /> : "Supprimer fond"}
                  </button>
                )}
                <button className="pso-pill-sm pso-active"
                  onClick={() => selectedImageForSearch && handleImageSearch(selectedImageForSearch)}
                  disabled={isSearching}>
                  {isSearching ? <span className="pso-spinner" /> : "Analyser →"}
                </button>
              </div>
            )}

          </div>
        )}

        <Link href="/recherche" className="pso-see-all">Rechercher un luminaire →</Link>
      </div>

      {/* ── Panneau résultats ── */}
      {(searchResults.length > 0 || (searchError && searchMode !== null) || (isSearching && searchMode !== null)) && (
        <div className="pso-results">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.5rem" }}>
            <span style={{ fontFamily:'"Playfair Display",serif', color:TEXT_DARK, fontWeight:600, fontSize:"0.95rem" }}>
              {isSearching ? "Recherche en cours…"
                : searchError ? "Résultats"
                : `${searchResults.length} résultat${searchResults.length > 1 ? "s" : ""} trouvé${searchResults.length > 1 ? "s" : ""}`}
            </span>
            <button className="pso-close-btn"
              onClick={() => { setSearchResults([]); setSearchError(null); setIsSearching(false) }}
              title="Fermer">✕</button>
          </div>

          {isSearching && (
            <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
              <span className="pso-spinner" style={{ width:"28px", height:"28px", borderWidth:"3px" }} />
            </div>
          )}

          {searchError && !isSearching && (
            <p style={{ color:"#c0392b", fontSize:"0.85rem", textAlign:"center", margin:"0.5rem 0" }}>{searchError}</p>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="pso-results-grid">
              {searchResults.map((result, i) => (
                <div key={i} className="pso-result-card"
                  onClick={() => { if (result.luminaireUrl) router.push(result.luminaireUrl) }}>
                  <img src={result.imageUrl || "/placeholder.svg"} alt={result.nom || ""}
                    onError={e => { e.currentTarget.src = "/placeholder.svg" }} />
                  <p style={{ color:TEXT_DARK }}>{result.nom || "—"}</p>
                  {result.artiste && <p style={{ color:"#7a6654", fontSize:"0.65rem" }}>{result.artiste}</p>}
                  {result.similarity != null && result.similarity > 0 && (
                    <p style={{ color:BROWN, fontSize:"0.65rem" }}>{Math.round(result.similarity * 100)}%</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Éléments cachés */}
      <canvas ref={canvasRef} style={{ display:"none" }} />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display:"none" }} />

      {showLoginModal && <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
    </>
  )
}
