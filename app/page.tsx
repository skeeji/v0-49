"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Camera, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

const apiUrl = "https://image-similarity-api-590690354412.us-central1.run.app/api/search"

export default function HomePage() {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [welcomeVideo, setWelcomeVideo] = useState("")
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [searchMode, setSearchMode] = useState<"camera" | "upload" | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [canSearchAgain, setCanSearchAgain] = useState(false)
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  const [backgroundRemovedImage, setBackgroundRemovedImage] = useState<string | null>(null)
  const [showBackgroundOptions, setShowBackgroundOptions] = useState(false)
  const [selectedImageForSearch, setSelectedImageForSearch] = useState<File | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { user, userData, incrementSearchCount, canSearch } = useAuth()

  // --- DÉBUT DE LA SEULE MODIFICATION ---
  useEffect(() => {
    async function fetchInitialData() {
      // Charger les luminaires depuis l'API pour la recherche
      try {
        const res = await fetch('/api/luminaires');
        const data = await res.json();
        if (data.success) {
          setLuminaires(data.luminaires);
        }
      } catch (e) { console.error("Erreur chargement luminaires", e); }

      // Charger la vidéo d'accueil depuis l'API
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings?.welcomeVideoId) {
          setWelcomeVideo(`/api/video/${data.settings.welcomeVideoId}`);
        }
      } catch (e) { console.error("Erreur chargement vidéo", e); }
    }
    fetchInitialData();
  }, []) // Exécuté une seule fois pour remplacer localStorage

  const processApiResults = (apiResults: any[]) => {
    return apiResults.map((result) => {
      const cleanImageId = String(result.image_id || "").split("#")[0];
      const finalImageUrl = result.image_url || "/placeholder.svg";
      const localMatch = luminaires.find((luminaire: any) => {
        const localFilename = (luminaire.filename || "").toLowerCase();
        const searchFilename = cleanImageId.toLowerCase();
        return localFilename === searchFilename || localFilename.includes(searchFilename.replace(/\.[^/.]+$/, ""));
      });
      const slug = cleanImageId.replace(/\.[^/.]+$/, "");
      return {
        ...result,
        imageId: cleanImageId, slug, imageUrl: finalImageUrl,
        ficheUrl: `/luminaires/${slug}`,
        luminaireUrl: localMatch ? `/luminaires/${localMatch._id}` : null,
        localMatch, hasLocalMatch: !!localMatch,
      };
    });
  };
  // --- FIN DE LA MODIFICATION ---

  const callImageSimilarityAPI = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("top_k", "10")
      const response = await fetch(apiUrl, { method: "POST", body: formData, headers: { Accept: "application/json" } })
      if (response.ok) {
        const jsonData = await response.json()
        if (jsonData.results && Array.isArray(jsonData.results)) { return { success: true, data: jsonData.results, type: "json_success" } }
        else { return { success: false, data: [], type: "no_results_array" } }
      } else {
        const errorText = await response.text();
        return { success: false, data: [], type: "http_error", status: response.status, error: errorText }
      }
    } catch (error: any) { return { success: false, data: [], type: "network_error", error: error.message } }
  }

  const removeBackground = async (file: File) => {
    setIsRemovingBackground(true)
    try {
      const formData = new FormData(); formData.append("image_file", file); formData.append("size", "auto");
      const response = await fetch("https://api.remove.bg/v1.0/removebg", { method: "POST", headers: { "X-Api-Key": "CxDYnAaszk34fhCYLBDBikZp" }, body: formData })
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setBackgroundRemovedImage(imageUrl);
        setCapturedImage(imageUrl);
        const pngFile = new File([blob], `${file.name.split(".")[0]}_no_bg.png`, { type: "image/png" });
        toast.success("Arrière-plan supprimé !");
        return pngFile;
      } else { toast.error("Erreur suppression d'arrière-plan"); return null; }
    } catch (error) { toast.error("Erreur suppression d'arrière-plan"); return null; } finally { setIsRemovingBackground(false); }
  }

  const handleImageSearch = async (file: File) => {
    if (!canSearch) { toast.error("Limite de recherches atteinte"); return; }
    if (!user) { setShowLoginModal(true); return; }
    if (userData?.role === "free") { const canProceed = await incrementSearchCount(); if (!canProceed) return; }
    setIsSearching(true); setSearchResults([]);
    try {
      const apiResponse = await callImageSimilarityAPI(file);
      if (apiResponse.success && apiResponse.data?.length > 0) {
        const processed = processApiResults(apiResponse.data)
        setSearchResults(processed);
        toast.success(`${processed.length} résultats trouvés.`);
      } else { toast.info("Aucun résultat trouvé"); }
    } catch (error) { toast.error("Erreur de recherche"); }
    finally { setCanSearchAgain(true); setIsSearching(false); }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file); setSelectedImageForSearch(file); setSearchMode("upload");
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage(imageUrl); setShowBackgroundOptions(true);
    }
  }

  const cleanupCamera = () => {
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    setIsCameraActive(false); setIsCameraLoading(false);
  }

  const startCamera = async () => {
    if (typeof window !== "undefined" && window.location.protocol !== 'https:') { toast.error("La caméra nécessite une connexion HTTPS."); return; }
    try {
      setSearchMode("camera"); setIsCameraLoading(true); cleanupCamera();
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 1280, height: 720 } });
      setStream(mediaStream); setIsCameraLoading(false); setIsCameraActive(true);
      if (videoRef.current) { videoRef.current.srcObject = mediaStream; videoRef.current.play().catch(console.error); }
    } catch (err: any) { toast.error(err.message || "Erreur caméra"); cleanupCamera(); setSearchMode(null); }
  };

  const capturePhoto = async () => {
    if (isCapturing || !videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);
    try {
      const video = videoRef.current; const canvas = canvasRef.current;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if(!blob) throw new Error("Erreur Blob");
      const file = new File([blob], `capture.jpg`, { type: "image/jpeg" });
      setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
      setSelectedFile(file); cleanupCamera(); setShowBackgroundOptions(true); setSelectedImageForSearch(file);
    } catch (e: any) { toast.error(e.message); }
    finally { setIsCapturing(false); }
  }

  const resetSearch = () => {
    if (capturedImage?.startsWith("blob:")) URL.revokeObjectURL(capturedImage);
    if (backgroundRemovedImage?.startsWith("blob:")) URL.revokeObjectURL(backgroundRemovedImage);
    cleanupCamera();
    setCapturedImage(null); setSelectedFile(null); setSearchMode(null); setIsCapturing(false);
    setIsCameraLoading(false); setSearchResults([]); setCanSearchAgain(false);
    setIsRemovingBackground(false); setBackgroundRemovedImage(null); setShowBackgroundOptions(false);
    setSelectedImageForSearch(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
  
  const searchAgain = () => { if (selectedFile) { handleImageSearch(selectedFile); } };
  const searchWithOriginal = () => { if (selectedImageForSearch) { handleImageSearch(selectedImageForSearch); } };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {welcomeVideo ? (
        <video key={welcomeVideo} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover">
          <source src={welcomeVideo} type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-orange to-gold" />
      )}
      <div className="absolute inset-0 bg-orange opacity-60" />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen container-responsive">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-playfair text-white mb-4 leading-tight">
            Luminaires du Moyen Âge<br />à nos jours
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Découvrez des luminaires de toutes époques et styles
          </p>
        </div>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 md:p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-xl md:text-2xl font-playfair text-dark mb-4 md:mb-6 text-center">
            Recherche par image IA
          </h2>
          {userData?.role === "free" && (
            <div className="mb-4 p-2 bg-blue-50 rounded-lg text-xs text-blue-800">
              <p className="flex items-center">
                <span className="mr-1">ℹ️</span>
                <span>Compte gratuit : {3 - (userData.searchCount || 0)}/3 recherches restantes aujourd'hui</span>
              </p>
            </div>
          )}
          <div className="mb-4 text-center">
            <p className="text-xs md:text-sm text-gray-600">
              Prenez une photo ou téléversez une image pour trouver des luminaires similaires
            </p>
          </div>
          {capturedImage && !isSearching && searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2 text-center">Image analysée :</h3>
              <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden max-w-48 mx-auto">
                <Image src={capturedImage} alt="Image analysée" fill className="object-contain" />
              </div>
            </div>
          )}
          <video ref={videoRef} autoPlay playsInline muted onClick={capturePhoto} className={`w-full rounded-lg bg-black cursor-pointer ${searchMode === "camera" && isCameraActive && !capturedImage ? "block" : "hidden"}`} style={{ aspectRatio: "4/3" }}/>
          <canvas ref={canvasRef} className="hidden" />
          {!searchMode && !capturedImage && !isSearching && (
            <div className="space-y-3 md:space-y-4">
              <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-orange hover:bg-orange/90 text-white py-3 md:py-4 text-base md:text-lg" disabled={isSearching || !canSearch}>
                <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />Téléverser une image
              </Button>
              <Button onClick={startCamera} variant="outline" className="w-full border-orange text-orange hover:bg-orange hover:text-white py-3 md:py-4 text-base md:text-lg" disabled={isSearching || isCameraLoading || !canSearch}>
                {isCameraLoading ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-orange mr-2"></div>Activation caméra...</>) : (<><Camera className="w-4 h-4 md:w-5 md:h-5 mr-2" />Prendre une photo</>)}
              </Button>
              {!canSearch && userData?.role === "free" && ( <div className="text-center text-red-500 text-xs">Limite de recherches quotidiennes atteinte (3/3).<Link href="#" className="ml-1 underline">Passez à Premium</Link> pour des recherches illimitées.</div> )}
              <p className="text-xs text-gray-600 text-center">L'IA analyse votre image et trouve les 10 luminaires les plus similaires</p>
            </div>
          )}
          {searchMode === "camera" && isCameraLoading && (
            <div className="space-y-4 text-center">
                {/* ... contenu ... */}
            </div>
          )}
          {searchMode === "camera" && isCameraActive && !capturedImage && (
            <div className="space-y-4">
                {/* ... contenu ... */}
            </div>
          )}
          {isSearching && (
            <div className="space-y-4 text-center">
              {capturedImage && (<div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-4"><Image src={capturedImage} alt="Image en cours d'analyse" fill className="object-contain" /></div>)}
              <div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-orange mx-auto mb-2"></div><p className="text-sm font-medium text-dark">Analyse IA en cours...</p><p className="text-xs text-gray-500">Recherche des luminaires similaires</p></div>
            </div>
          )}
          {showBackgroundOptions && !isSearching && (
            <div className="space-y-4">
              {/* ... contenu ... */}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
        {searchResults.length > 0 && (
          <div className="mt-6 md:mt-8 bg-white/95 backdrop-blur-sm rounded-2xl p-4 md:p-6 max-w-6xl w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-3">
              <h3 className="text-lg md:text-xl font-playfair text-dark text-center md:text-left">🎯 Top {searchResults.length} luminaires similaires (IA)</h3>
              <div className="flex gap-2 justify-center md:justify-end">
                <Button onClick={searchAgain} className="bg-orange hover:bg-orange/90 text-sm md:text-base" size="sm" disabled={isSearching || !canSearch}>{isSearching ? (<div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>) : (<span>🔄 Refaire la recherche</span>)}</Button>
                <Button onClick={resetSearch} variant="outline" size="sm" className="text-sm md:text-base"><X className="w-4 h-4 mr-2" />Nouvelle image</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {searchResults.map((result: any, index) => (
                <div key={index} className="bg-white rounded-lg p-2 md:p-3 shadow-md border">
                  <Link href={result.hasLocalMatch && result.luminaireUrl ? result.luminaireUrl : "#"} className={!result.hasLocalMatch ? "pointer-events-none opacity-50" : ""}>
                    <div className="relative w-full h-24 md:h-32 mb-2 md:mb-3 cursor-pointer hover:scale-105 transition-transform">
                      <Image src={result.imageUrl} alt={result.imageId || `Résultat ${index + 1}`} fill className="object-cover rounded-lg" onError={(e) => { e.currentTarget.src = `/placeholder.svg?text=Image` }}/>
                    </div>
                  </Link>
                  <p className="text-xs md:text-sm font-medium text-dark truncate mb-1 md:mb-2">{result.metadata?.name || result.imageId}</p>
                  <p className="text-xs text-orange mb-2 md:mb-3">Similarité: {Math.round(result.similarity * 100)}%</p>
                  <p className="text-xs text-gray-500">{result.hasLocalMatch ? "Fiche disponible" : "Fiche externe"}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 md:mt-4 text-center text-xs md:text-sm text-gray-600">Cliquez sur une image pour voir la fiche détaillée</div>
          </div>
        )}
      </div>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  )
}
