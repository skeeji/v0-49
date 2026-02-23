"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Camera, Upload, X, Lamp, Users, Clock, CreditCard, ArrowRight, Search, Grid3x3, ChevronLeft, ChevronRight } from "lucide-react"
import { ChronoCarousel } from "@/components/chrono-carousel"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"
import MobileFooter from "@/components/MobileFooter" // Import MobileFooter

// URL correcte de l'API
const apiUrl = "https://image-similarity-api-590690354412.us-central1.run.app/api/search"

export default function HomePage() {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [previewDesigners, setPreviewDesigners] = useState<any[]>([])
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
  const [zoomLevel, setZoomLevel] = useState(1)

  // États pour les restrictions
  // const [searchCount, setSearchCount] = useState(0)
  // const [monthlySearchLimit] = useState(3)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { user, userData, incrementSearchCount } = useAuth()

  const callImageSimilarityAPI = async (file: File) => {
    try {
      console.log("🚀 Appel API de similarité d'images...")
      console.log(`📁 Fichier envoyé: ${file.name}, Taille: ${file.size} bytes, Type: ${file.type}`)

      const formData = new FormData()
      formData.append("image", file)
      formData.append("top_k", "10")

      console.log("📤 FormData créé, envoi vers:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      })

      console.log(`📥 Réponse API: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const jsonData = await response.json()
        console.log("📄 JSON reçu:", jsonData)

        if (jsonData.results && Array.isArray(jsonData.results)) {
          console.log(`✅ ${jsonData.results.length} résultats trouvés`)
          return { success: true, data: jsonData.results, type: "json_success" }
        } else {
          console.log("⚠️ Pas de tableau 'results' dans la réponse")
          return { success: false, data: [], type: "no_results_array" }
        }
      } else {
        const errorText = await response.text()
        console.log(`❌ Erreur HTTP: ${response.status} - ${errorText}`)
        return { success: false, data: [], type: "http_error", status: response.status, error: errorText }
      }
    } catch (error: any) {
      console.error("💥 Erreur API:", error)
      return { success: false, data: [], type: "network_error", error: error.message }
    }
  }

  const processApiResults = (apiResults: any[]) => {
    console.log(`🔍 Traitement de ${apiResults.length} résultats API`)

    const processedResults = apiResults.map((result, index) => {
      const imageId = result.image_id || `result_${index}`
      const similarity = result.similarity || 0
      const imageUrl = result.image_url || ""
      const metadata = result.metadata || {}

      // Nettoyer l'image_id pour obtenir le nom du fichier
      const cleanImageId = String(imageId).split("#")[0]

      // Construire l'URL complète
      let finalImageUrl = "/placeholder.svg?height=200&width=200&text=Image+non+disponible"
      if (imageUrl && String(imageUrl).trim()) {
        const urlString = String(imageUrl).trim()
        if (urlString.startsWith("http://") || urlString.startsWith("https://")) {
          finalImageUrl = urlString.split("#")[0]
        } else if (urlString.startsWith("/")) {
          finalImageUrl = `https://image-similarity-api-590690354412.us-central1.run.app${urlString.split("#")[0]}`
        } else {
          const cleanFileName = urlString.split("#")[0]
          finalImageUrl = `https://image-similarity-api-590690354412.us-central1.run.app/images/${cleanFileName}`
        }
      }

      // Chercher par filename dans la base MongoDB (même nom d'image)
      const localMatch = luminaires.find((luminaire: any) => {
        const localFilename = (luminaire.filename || luminaire["Nom du fichier"] || "").toLowerCase()
        const searchFilename = cleanImageId.toLowerCase()
        // Correspondance exacte par nom de fichier
        return localFilename === searchFilename
      })

      console.log(`🔍 Recherche: "${cleanImageId}" → ${localMatch ? `✅ Trouvé: ${localMatch._id}` : "❌ Pas trouvé"}`)

      return {
        imageId: cleanImageId,
        imageUrl: finalImageUrl,
        // Utiliser l'ID MongoDB pour créer le lien vers la page luminaire
        luminaireUrl: localMatch ? `/luminaires/${localMatch._id}` : null,
        localMatch: localMatch,
        hasLocalMatch: !!localMatch,
        index: index,
        similarity: similarity,
        metadata: metadata,
        hasValidUrl: finalImageUrl !== "/placeholder.svg?height=200&width=200&text=Image+non+disponible",
      }
    })

    return processedResults
  }

  const removeBackground = async (file: File) => {
    setIsRemovingBackground(true)
    try {
      console.log("🎨 Début suppression arrière-plan...")
      console.log(`📁 Fichier: ${file.name}, Taille: ${file.size} bytes`)

      const formData = new FormData()
      formData.append("image_file", file)
      formData.append("size", "auto")

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": "CxDYnAaszk34fhCYLBDBikZp",
        },
        body: formData,
      })

      if (response.ok) {
        const blob = await response.blob()
        console.log(`✅ Arrière-plan supprimé: ${blob.size} bytes`)

        // Créer une URL pour afficher l'image
        const imageUrl = URL.createObjectURL(blob)
        setBackgroundRemovedImage(imageUrl)

        // Mettre à jour immédiatement l'affichage
        setCapturedImage(imageUrl)

        // Créer un nouveau fichier PNG
        const pngFile = new File([blob], `${file.name.split(".")[0]}_no_bg.png`, {
          type: "image/png",
          lastModified: Date.now(),
        })

        toast.success("Arrière-plan supprimé avec succès!")
        return pngFile
      } else {
        const errorText = await response.text()
        console.error("❌ Erreur API remove.bg:", response.status, errorText)
        toast.error("Erreur lors de la suppression d'arrière-plan")
        return null
      }
    } catch (error) {
      console.error("💥 Erreur suppression arrière-plan:", error)
      toast.error("Erreur lors de la suppression d'arrière-plan")
      return null
    } finally {
      setIsRemovingBackground(false)
    }
  }

  const handleImageSearch = async (file: File) => {
    // Vérifier si l'utilisateur est connecté
    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche IA")
      setShowLoginModal(true)
      return
    }

    // Vérifier la limite pour les utilisateurs gratuits connectés
    if (userData?.role === "free") {
      const canProceed = await incrementSearchCount()
      if (!canProceed) {
        return // Le message d'erreur est déjà affiché par incrementSearchCount
      }
    }

    setIsSearching(true)
    setSearchResults([])

    try {
      console.log("🔍 Début de la recherche par image IA...")
      console.log(`📁 Fichier: ${file.name}, Taille: ${file.size} bytes, Type: ${file.type}`)

      const apiResponse = await callImageSimilarityAPI(file)

      if (apiResponse.success && apiResponse.data && apiResponse.data.length > 0) {
        console.log(`🎉 API réussie! ${apiResponse.data.length} résultats`)
        const processedResults = processApiResults(apiResponse.data)

        if (processedResults.length > 0) {
          setSearchResults(processedResults)
          const localMatches = processedResults.filter((r) => r.hasLocalMatch).length
          console.log(`🎯 ${processedResults.length} résultats traités, ${localMatches} avec correspondance locale`)
          toast.success(`${processedResults.length} luminaire(s) similaire(s) trouvé(s)`)

          // Message d'avertissement pour les utilisateurs gratuits
          if (userData?.role === "free") {
            const remaining = 3 - (userData.searchCount || 0)
            if (remaining <= 1) {
              toast.warning(`Plus que ${remaining} recherche(s) restante(s) ce mois-ci`)
            }
          }
        } else {
          toast.info("Aucun résultat trouvé")
        }
      } else {
        console.log(`❌ API échouée: ${apiResponse.type}`)
        toast.error("Erreur lors de l'appel à l'API IA")
      }
    } catch (error) {
      console.error("💥 Erreur générale:", error)
      toast.error("Erreur lors de la recherche")
    } finally {
      setCanSearchAgain(true)
      setIsSearching(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log("📁 Fichier sélectionné via upload:", file.name, file.size, "bytes", file.type)
      setSelectedFile(file)
      setSelectedImageForSearch(file)
      setSearchMode("upload")

      // Créer une URL pour prévisualiser l'image
      const imageUrl = URL.createObjectURL(file)
      setCapturedImage(imageUrl)
      setShowBackgroundOptions(true)
      console.log("🖼️ URL de prévisualisation créée pour upload")
    }
  }

  const cleanupCamera = () => {
    console.log("🧹 Nettoyage complet de la caméra...")
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log(`🔌 Arrêt du track: ${track.kind}, état avant: ${track.readyState}`)
        track.stop()
        console.log(`✅ Track ${track.kind} arrêté, état après: ${track.readyState}`)
      })
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.pause()
      videoRef.current.load()
      console.log("📺 Élément vidéo nettoyé")
    }
    setIsCameraActive(false)
    setIsCameraLoading(false)
    console.log("✅ Nettoyage caméra terminé")
  }

  const startCamera = async () => {
    try {
      console.log("📷 === DÉMARRAGE CAMÉRA ===")
      setSearchMode("camera")
      setIsCameraLoading(true)

      // Vérifier la disponibilité de l'API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'API caméra n'est pas disponible sur cet appareil ou navigateur")
      }

      // Nettoyer tout flux existant
      cleanupCamera()

      console.log("🎥 Demande d'accès à la caméra...")

      // Contraintes optimisées pour la compatibilité
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          zoom: true,
        },
        audio: false,
      }

      console.log("📋 Contraintes caméra:", JSON.stringify(constraints, null, 2))

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      console.log("✅ MediaStream obtenu avec succès")
      console.log(`📊 Nombre de tracks: ${mediaStream.getTracks().length}`)

      setStream(mediaStream)
      setIsCameraLoading(false)
      setIsCameraActive(true)
      setZoomLevel(1)

      // Attacher le flux après que l'état soit mis à jour
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          console.log("🔗 Attachement du flux à l'élément vidéo...")
          videoRef.current.srcObject = mediaStream
          videoRef.current.play().catch(console.error)
          toast.success("Caméra activée - Touchez l'écran pour capturer")
        }
      }, 100)
    } catch (error: any) {
      console.error("❌ === ERREUR CAMÉRA ===", error)
      let errorMessage = "Impossible d'accéder à la caméra"

      if (error.name === "NotAllowedError") {
        errorMessage = "Permission caméra refusée. Veuillez autoriser l'accès dans votre navigateur."
      } else if (error.name === "NotFoundError") {
        errorMessage = "Aucune caméra trouvée sur cet appareil."
      } else if (error.name === "NotReadableError") {
        errorMessage = "Caméra déjà utilisée par une autre application."
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Contraintes caméra non supportées par votre appareil."
      } else if (error.name === "SecurityError") {
        errorMessage = "Accès caméra bloqué pour des raisons de sécurité."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage)
      cleanupCamera()
      setSearchMode(null)
    }
  }

  const capturePhoto = async () => {
    if (isCapturing) {
      console.log("⏳ Capture déjà en cours, ignorée")
      return
    }

    setIsCapturing(true)
    try {
      console.log("📸 === DÉBUT CAPTURE PHOTO ===")

      // Vérifications préliminaires
      if (!videoRef.current) {
        throw new Error("Élément vidéo non disponible")
      }

      if (!canvasRef.current) {
        throw new Error("Élément canvas non disponible")
      }

      const video = videoRef.current
      const canvas = canvasRef.current

      // Vérifier l'état de la vidéo
      console.log(`📊 État vidéo: readyState=${video.readyState}, paused=${video.paused}`)
      console.log(`📐 Dimensions vidéo: ${video.videoWidth} x ${video.videoHeight}`)

      if (video.readyState < 2) {
        throw new Error("Vidéo pas encore prête (readyState < 2)")
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error("Dimensions vidéo invalides (0x0)")
      }

      // Configurer le canvas avec les dimensions exactes de la vidéo
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      console.log(`🎨 Canvas configuré: ${canvas.width} x ${canvas.height}`)

      const context = canvas.getContext("2d")
      if (!context) {
        throw new Error("Impossible d'obtenir le contexte 2D du canvas")
      }

      // Dessiner l'image de la vidéo sur le canvas
      console.log("🖼️ Dessin de l'image vidéo sur le canvas...")
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Utiliser le format JPEG pour l'image
      const format = "image/jpeg"
      const quality = 0.9

      console.log("✅ Image traitée sur le canvas")

      // Utiliser le format JPEG pour l'image
      const fileName = `camera-capture-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (result) => {
            console.log("💾 Conversion canvas → blob:", result ? "succès" : "échec")
            if (result) {
              console.log(`📊 Blob créé: ${result.size} bytes, type: ${result.type}`)
            }
            resolve(result)
          },
          format,
          quality,
        )
      })

      if (!blob) {
        throw new Error("Échec de la conversion canvas → blob")
      }

      // Créer un File identique à un upload
      const file = new File([blob], fileName, {
        type: format,
        lastModified: Date.now(),
      })

      console.log("📁 File créé:")
      console.log(`   - Nom: ${file.name}`)
      console.log(`   - Taille: ${file.size} bytes`)
      console.log(`   - Type: ${file.type}`)
      console.log(`   - Capture terminée avec succès`)

      // Mettre à jour les états (identique à un upload)
      const previewUrl = canvas.toDataURL(format, quality)
      setCapturedImage(previewUrl)
      setSelectedFile(file)

      // Arrêter la caméra après capture
      cleanupCamera()

      console.log("✅ === CAPTURE TERMINÉE AVEC SUCCÈS ===")
      toast.success("Photo capturée avec succès!")

      // Afficher les options d'arrière-plan
      setShowBackgroundOptions(true)
      setSelectedImageForSearch(file)
    } catch (error: any) {
      console.error("💥 === ERREUR CAPTURE ===", error)
      toast.error(`Erreur capture: ${error.message}`)
    } finally {
      setIsCapturing(false)
    }
  }

  const resetSearch = () => {
    console.log("🔄 === RÉINITIALISATION COMPLÈTE ===")

    // Nettoyer les URLs de prévisualisation
    if (capturedImage && capturedImage.startsWith("blob:")) {
      URL.revokeObjectURL(capturedImage)
      console.log("🗑️ URL blob révoquée")
    }

    if (backgroundRemovedImage && backgroundRemovedImage.startsWith("blob:")) {
      URL.revokeObjectURL(backgroundRemovedImage)
      console.log("🗑️ URL blob arrière-plan supprimé révoquée")
    }

    // Arrêter la caméra si active
    if (isCameraActive || stream) {
      cleanupCamera()
    }

    // Réinitialiser tous les états
    setCapturedImage(null)
    setSelectedFile(null)
    setSearchMode(null)
    setIsCapturing(false)
    setIsCameraLoading(false)
    setSearchResults([])
    setCanSearchAgain(false)
    setIsRemovingBackground(false)
    setBackgroundRemovedImage(null)
    setShowBackgroundOptions(false)
    setSelectedImageForSearch(null)
    setZoomLevel(1)

    // Réinitialiser l'input file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    console.log("✅ Réinitialisation terminée")
  }

  const searchAgain = () => {
    if (selectedFile) {
      console.log("🔄 Nouvelle recherche avec la même image")
      setIsSearching(true)
      setSearchResults([])
      setTimeout(() => {
        handleImageSearch(selectedFile)
      }, 500)
    } else {
      toast.error("Aucune image disponible pour la recherche")
    }
  }

  const searchWithOriginal = () => {
    if (selectedImageForSearch) {
      console.log("[v0] Recherche avec image (possiblement traitée):", selectedImageForSearch.name)
      setShowBackgroundOptions(false)
      handleImageSearch(selectedImageForSearch)
    } else if (selectedFile) {
      console.log("[v0] Recherche avec image originale:", selectedFile.name)
      setShowBackgroundOptions(false)
      handleImageSearch(selectedFile)
    }
  }

  useEffect(() => {
    // Charger les luminaires depuis l'API MongoDB
    const loadLuminaires = async () => {
      try {
        const response = await fetch("/api/luminaires?limit=10000") // Charger tous les luminaires
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setLuminaires(data.luminaires)
            console.log(`📊 ${data.luminaires.length} luminaires chargés pour la recherche IA`)
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des luminaires:", error)
      }
    }

  // Charger des designers celebres et recents pour la preview
  const loadDesigners = async () => {
  try {
    // Chercher des designers connus et recents
    const knownNames = ["Caffieri", "Royere", "Starck", "Tom Dixon", "Lalique", "Galle", "Daum", "Tiffany"]
    const results: any[] = []
    for (const name of knownNames) {
      if (results.length >= 6) break
      try {
        const res = await fetch(`/api/designers?search=${encodeURIComponent(name)}&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.designers.length > 0) {
            const d = data.designers[0]
            if (d.image && !results.find((r: any) => r.id === d.id)) {
              results.push(d)
            }
          }
        }
      } catch {}
    }
    // Si pas assez, completer avec le fetch classique
    if (results.length < 6) {
      const fallback = await fetch("/api/designers?limit=20")
      if (fallback.ok) {
        const data = await fallback.json()
        if (data.success) {
          for (const d of data.designers) {
            if (results.length >= 6) break
            if (d.image && !results.find((r: any) => r.id === d.id)) {
              results.push(d)
            }
          }
        }
      }
    }
    setPreviewDesigners(results)
  } catch (error) {
  console.error("Erreur chargement designers preview:", error)
  }
  }

    loadDesigners()

    // Charger la vidéo d'accueil depuis l'API
    const loadWelcomeVideo = async () => {
      try {
        console.log("🎥 Chargement de la vidéo de bienvenue...")
        const response = await fetch("/api/welcome-video")
        if (response.ok) {
          const data = await response.json()
          console.log("📄 Réponse API vidéo:", data)
          if (data.success && data.video) {
            const videoUrl = `/api/videos/${data.video._id}`
            setWelcomeVideo(videoUrl)
            console.log("✅ Vidéo de bienvenue chargée:", videoUrl)
          } else {
            console.log("⚠️ Pas de vidéo trouvée dans la réponse")
          }
        } else {
          console.log("❌ Erreur HTTP lors du chargement de la vidéo:", response.status)
        }
      } catch (error) {
        console.error("💥 Erreur lors du chargement de la vidéo:", error)
      }
    }

    loadLuminaires()
    loadWelcomeVideo()

    // Cleanup au démontage du composant
    return () => {
      console.log("🧹 Cleanup au démontage du composant")
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (capturedImage && capturedImage.startsWith("blob:")) {
        URL.revokeObjectURL(capturedImage)
      }
    }
  }, [])

  const handleZoomIn = async () => {
    if (!stream) return

    const videoTrack = stream.getVideoTracks()[0]
    const capabilities = videoTrack.getCapabilities() as any

    if (capabilities.zoom) {
      const newZoom = Math.min(zoomLevel + 0.5, Math.min(capabilities.zoom.max || 10, 10))
      try {
        await videoTrack.applyConstraints({
          advanced: [{ zoom: newZoom } as any],
        })
        setZoomLevel(newZoom)
        console.log(`🔍 Zoom appliqué: ${newZoom}x`)
      } catch (error) {
        console.error("Erreur zoom:", error)
        toast.error("Zoom non supporté sur cet appareil")
      }
    } else {
      toast.info("Zoom non supporté sur cet appareil")
    }
  }

  const handleZoomOut = async () => {
    if (!stream) return

    const videoTrack = stream.getVideoTracks()[0]
    const capabilities = videoTrack.getCapabilities() as any

    if (capabilities.zoom) {
      const newZoom = Math.max(zoomLevel - 0.5, capabilities.zoom.min || 1)
      try {
        await videoTrack.applyConstraints({
          advanced: [{ zoom: newZoom } as any],
        })
        setZoomLevel(newZoom)
        console.log(`🔍 Zoom appliqué: ${newZoom}x`)
      } catch (error) {
        console.error("Erreur zoom:", error)
      }
    }
  }

  return (
    <div className="bg-[#f5f1e8]">
      {/* Hero section */}
      <div className="relative min-h-screen">
      {/* Vidéo de fond */}
      {welcomeVideo && (
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
          <source src={welcomeVideo} type="video/mp4" />
        </video>
      )}

      {/* Overlay plus clair */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-orange-50/60 to-yellow-50/40" />

      {/* Contenu principal */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-serif leading-tight" style={{ color: "#8b7355" }}>
            Luminaires
            <br />
            <span className="text-2xl md:text-3xl font-light">Du Moyen-âge à nos jours</span>
          </h1>
        </div>

        {/* Zone de recherche par image */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-6 md:p-10 max-w-lg w-full shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <h2 className="text-2xl md:text-3xl font-serif" style={{ color: "#8b7355" }}>
                Recherche IA
              </h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Photographiez ou téléversez une image pour découvrir des luminaires similaires dans notre collection
            </p>
          </div>

          {/* Appel à l'action pour les comptes premium */}
          {(!user || userData?.role === "free") && (
            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">
                🌟 Passez à Premium pour des recherches illimitées et la suppression d'arrière-plan !
                <Link href="/pricing" className="ml-1 underline font-bold hover:no-underline">
                  Découvrir Premium
                </Link>
              </p>
            </div>
          )}

          {/* Affichage de l'image après recherche */}
          {capturedImage && !isSearching && searchResults.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-slate-700 mb-4 text-center">Image analysée :</h3>
              <div className="aspect-square relative bg-slate-100 rounded-2xl overflow-hidden max-w-64 mx-auto shadow-lg">
                <Image src={capturedImage || "/placeholder.svg"} alt="Image analysée" fill className="object-contain" />
              </div>
            </div>
          )}

          {/* Éléments vidéo et canvas toujours présents mais cachés */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onClick={capturePhoto}
            className={`w-full rounded-2xl bg-slate-900 cursor-pointer shadow-lg ${
              searchMode === "camera" && isCameraActive && !capturedImage ? "block" : "hidden"
            }`}
            style={{ aspectRatio: "4/3" }}
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* Étape 1: Sélection de la méthode */}
          {!searchMode && !capturedImage && !isSearching && (
            <div className="space-y-4">
              <Button
                onClick={() => {
                  if (!user) {
                    toast.error("Connexion requise pour utiliser la recherche IA")
                    setShowLoginModal(true)
                    return
                  }
                  fileInputRef.current?.click()
                }}
                className="w-full text-white py-4 text-lg rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                style={{ backgroundColor: "#8b7355" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7a6345")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#8b7355")}
                disabled={isSearching}
              >
                <Upload className="w-5 h-5 mr-3" />
                Téléverser une image
              </Button>

              <Button
                onClick={() => {
                  if (!user) {
                    toast.error("Connexion requise pour utiliser la recherche IA")
                    setShowLoginModal(true)
                    return
                  }
                  if (userData?.role === "free") {
                    toast.error("Fonctionnalité réservée aux comptes Premium")
                    return
                  }
                  startCamera()
                }}
                className="w-full text-white py-4 text-lg rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                style={{ backgroundColor: userData?.role === "free" ? "#ccc" : "#8b7355" }}
                onMouseEnter={(e) => {
                  if (userData?.role !== "free") {
                    e.currentTarget.style.backgroundColor = "#7a6345"
                  }
                }}
                onMouseLeave={(e) => {
                  if (userData?.role !== "free") {
                    e.currentTarget.style.backgroundColor = "#8b7355"
                  }
                }}
                disabled={isSearching || isCameraLoading || userData?.role === "free"}
              >
                {isCameraLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white mr-3"></div>
                    Activation caméra...
                  </>
                ) : userData?.role === "free" ? (
                  <>
                    <Camera className="w-5 h-5 mr-3" />
                    Fonctionnalité Premium
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-3" />
                    Prendre une photo
                  </>
                )}
              </Button>

              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Connectez-vous pour utiliser notre IA qui analyse votre image et trouve les 10 luminaires les plus
                similaires
              </p>
            </div>
          )}

          {/* Étape 2a: Caméra en cours d'activation */}
          {searchMode === "camera" && isCameraLoading && (
            <div className="space-y-6 text-center">
              <div className="w-full h-64 bg-slate-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div
                    className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 mx-auto mb-4"
                    style={{ borderTopColor: "#8b7355" }}
                  ></div>
                  <p className="text-slate-600 font-medium">Activation de la caméra...</p>
                </div>
              </div>
              <Button onClick={resetSearch} variant="outline" className="w-full rounded-xl bg-transparent">
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          )}

          {/* Étape 2b: Caméra active */}
          {searchMode === "camera" && isCameraActive && !capturedImage && (
            <div className="space-y-6">
              {/* Overlay avec instructions */}
              <div className="relative -mt-4">
                {/* Indicateur de statut */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
                  <div className="bg-black/70 text-[#8b7355] px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                    Touchez l'écran pour capturer
                  </div>
                </div>
                <div className="absolute top-3 right-3 bg-black/70 text-white text-sm px-3 py-2 rounded-lg z-10 shadow-lg">
                  {zoomLevel.toFixed(1)}x
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleZoomOut}
                  className="w-12 h-12 rounded-full text-white text-xl font-bold"
                  style={{ backgroundColor: "#8b7355" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7a6345")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#8b7355")}
                  disabled={isCapturing || zoomLevel <= 1}
                >
                  -
                </Button>
                <Button
                  onClick={handleZoomIn}
                  className="w-12 h-12 rounded-full text-white text-xl font-bold"
                  style={{ backgroundColor: "#8b7355" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7a6345")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#8b7355")}
                  disabled={isCapturing}
                >
                  +
                </Button>
              </div>

              {/* Boutons de contrôle */}
              <div className="flex gap-3">
                <Button
                  onClick={capturePhoto}
                  className="flex-1 text-white rounded-xl"
                  style={{ backgroundColor: "#8b7355" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7a6345")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#8b7355")}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                      Capture...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />📸 Capturer
                    </>
                  )}
                </Button>
                <Button
                  onClick={resetSearch}
                  variant="outline"
                  className="px-6 rounded-xl bg-transparent"
                  disabled={isCapturing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Cadrez le luminaire et touchez l'écran ou le bouton pour capturer
              </p>
            </div>
          )}

          {/* Étape 3: Recherche en cours */}
          {isSearching && (
            <div className="space-y-6 text-center">
              {capturedImage && (
                <div className="aspect-square relative bg-slate-100 rounded-2xl overflow-hidden mb-6 shadow-lg">
                  <Image
                    src={capturedImage || "/placeholder.svg"}
                    alt="Image en cours d'analyse"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <div className="text-center">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 mx-auto mb-4"
                  style={{ borderTopColor: "#8b7355" }}
                ></div>
                <p className="text-lg font-medium text-slate-800 mb-2">Analyse IA en cours...</p>
                <p className="text-sm text-slate-600">Recherche des luminaires similaires dans notre collection</p>

                {/* Message d'avertissement pour les utilisateurs gratuits */}
                {userData?.role === "free" && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Plus que {3 - (userData.searchCount || 0)} recherche(s) restante(s) ce mois-ci.
                      <Link href="/pricing" className="ml-1 underline font-medium">
                        Passez à Premium
                      </Link>{" "}
                      pour des recherches illimitées.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Étape 2.5: Options d'arrière-plan */}
          {showBackgroundOptions && !isSearching && (
            <div className="space-y-6">
              <div className="aspect-square relative bg-slate-100 rounded-2xl overflow-hidden mb-6 shadow-lg">
                <Image src={capturedImage || "/placeholder.svg"} alt="Image capturée" fill className="object-contain" />
              </div>

              <div className="space-y-6">
                {/* Checkbox pour supprimer l'arrière-plan */}
                {showBackgroundOptions && selectedImageForSearch && (
                  <div className="flex items-center gap-2 mb-3 mt-3">
                    <input
                      type="checkbox"
                      id="removeBackground"
                      className="w-5 h-5 bg-white border-slate-300 rounded focus:ring-2"
                      style={{ accentColor: "#8b7355" }}
                      onChange={async (e) => {
                        if (e.target.checked) {
                          if (selectedImageForSearch && !isRemovingBackground) {
                            const processedFile = await removeBackground(selectedImageForSearch)
                            if (processedFile) {
                              // Mettre à jour avec le fichier traité
                              setSelectedImageForSearch(processedFile)
                              console.log("[v0] Image mise à jour avec arrière-plan supprimé:", processedFile.name)
                            }
                          }
                        } else {
                          if (selectedFile) {
                            const originalUrl = URL.createObjectURL(selectedFile)
                            setCapturedImage(originalUrl)
                            setSelectedImageForSearch(selectedFile)
                            console.log("[v0] Image remise à l'originale:", selectedFile.name)
                            // Nettoyer l'ancienne URL de l'image sans arrière-plan
                            if (backgroundRemovedImage) {
                              URL.revokeObjectURL(backgroundRemovedImage)
                              setBackgroundRemovedImage(null)
                            }
                          }
                        }
                      }}
                      disabled={isRemovingBackground}
                    />
                    <label htmlFor="removeBackground" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Supprimer l'arrière-plan avant la recherche
                    </label>
                  </div>
                )}

                {/* Afficher la checkbox seulement pour les utilisateurs premium/admin */}
                

                {/* Message pour les utilisateurs gratuits */}
                {(!user || userData?.role === "free") && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm text-yellow-800">
                      <strong>Fonctionnalité Premium :</strong> La suppression d'arrière-plan est disponible avec un
                      abonnement Premium.
                      <Link href="/pricing" className="ml-2 underline">
                        Voir les forfaits
                      </Link>
                    </p>
                  </div>
                )}

                {isRemovingBackground && (
                  <div className="text-center py-6">
                    <div
                      className="animate-spin rounded-full h-8 w-8 border-4 border-slate-300 mx-auto mb-3"
                      style={{ borderTopColor: "#8b7355" }}
                    ></div>
                    <p className="text-sm text-slate-600">Suppression de l'arrière-plan en cours...</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={searchWithOriginal}
                    className="flex-1 text-white rounded-xl"
                    style={{ backgroundColor: "#8b7355" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7a6345")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#8b7355")}
                    disabled={isRemovingBackground}
                  >
                    Rechercher maintenant
                  </Button>
                  <Button onClick={resetSearch} variant="outline" className="px-6 rounded-xl bg-transparent">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center">
                {user && userData?.role !== "free"
                  ? "La suppression d'arrière-plan peut améliorer la précision de la recherche"
                  : "Connectez-vous avec un compte Premium pour plus de fonctionnalités"}
              </p>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="mt-8 bg-white/95 backdrop-blur-lg rounded-3xl p-6 md:p-8 max-w-7xl w-full shadow-2xl border border-white/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <h3 className="text-2xl md:text-3xl font-serif text-slate-800 text-center md:text-left">
                🎯 Top {searchResults.length} luminaires similaires
              </h3>
              <div className="flex gap-3 justify-center md:justify-end">
                <Button
                  onClick={searchAgain}
                  className="text-white rounded-xl shadow-lg"
                  style={{ backgroundColor: "#8b7355" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7a6345")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#8b7355")}
                  size="sm"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                  ) : (
                    <span>🔄 Refaire la recherche</span>
                  )}
                </Button>
                <Button
                  onClick={resetSearch}
                  variant="outline"
                  size="sm"
                  className="rounded-xl shadow-lg bg-transparent"
                >
                  <X className="w-4 h-4 mr-2" />
                  Nouvelle image
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {searchResults.map((result: any, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200"
                >
                  {/* Image cliquable */}
                  {result.hasLocalMatch && result.luminaireUrl ? (
                    <Link href={result.luminaireUrl}>
                      <div className="relative w-full h-32 md:h-40 mb-4 cursor-pointer hover:scale-105 transition-transform duration-200">
                        <Image
                          src={result.imageUrl || "/placeholder.svg"}
                          alt={result.imageId || `Résultat ${index + 1}`}
                          fill
                          className="object-cover rounded-xl"
                          onError={(e) => {
                            const fallbackUrl = `/placeholder.svg?height=200&width=200&text=${encodeURIComponent(result.imageId || `Image ${index + 1}`)}`
                            e.currentTarget.src = fallbackUrl
                          }}
                        />
                      </div>
                    </Link>
                  ) : (
                    <div className="relative w-full h-32 md:h-40 mb-4">
                      <Image
                        src={result.imageUrl || "/placeholder.svg"}
                        alt={result.imageId || `Résultat ${index + 1}`}
                        fill
                        className="object-cover rounded-xl"
                        onError={(e) => {
                          const fallbackUrl = `/placeholder.svg?height=200&width=200&text=${encodeURIComponent(result.imageId || `Image ${index + 1}`)}`
                          e.currentTarget.src = fallbackUrl
                        }}
                      />
                    </div>
                  )}

                  <p className="text-sm font-medium text-slate-800 truncate mb-2">
                    {result.localMatch?.nom || result.imageId || `Résultat ${index + 1}`}
                  </p>

                  <p className="text-sm text-slate-600 mb-3">Similarité: {Math.round(result.similarity * 100)}%</p>

                  <p className="text-xs text-slate-500">
                    {result.hasLocalMatch ? "Fiche disponible" : "Image similaire"}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-sm text-slate-600">
              Cliquez sur une image pour voir la fiche détaillée
            </div>
          </div>
        )}
      </div>
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <div className="flex flex-col items-center gap-1 text-[#8b7355]/60">
          <span className="text-xs font-medium">Decouvrir</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      </div>{/* End hero section */}

      {/* ========== PRESENTATION DES PAGES ========== */}
      <div className="relative z-10 bg-[#f5f1e8]">

        {/* Section Collection */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-sm font-medium text-[#8b7355] uppercase tracking-wider mb-4 block">Collection</span>
              <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-3 text-balance">
                Plus de {luminaires.length > 0 ? luminaires.length.toLocaleString("fr-FR") : "9 000"} luminaires
              </h2>
              <p className="text-gray-600 leading-relaxed max-w-xl mx-auto">
                Explorez notre catalogue par categorie, du lustre monumental a la lampe de chevet.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-x-8 gap-y-10 md:gap-x-16 max-w-3xl mx-auto">
              {(() => {
                const categories = ["Lustre", "Applique", "Suspension", "Lampadaire", "Lampe", "Lanterne"]
                const usedIds = new Set<string>()
                return categories.map((cat, i) => {
                  const matches = luminaires.filter((l: any) => {
                    const c = (l.categorie || l["Catégorie"] || l.nom || "").toLowerCase()
                    return c.includes(cat.toLowerCase()) && l.filename && !usedIds.has(l._id)
                  })
                  const match = matches[Math.min(1, matches.length - 1)] || matches[0]
                  if (match) usedIds.add(match._id)
                  return (
                    <Link key={i} href={`/luminaires?categorie=${encodeURIComponent(cat)}`} className="group">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-[#8b7355]/20 group-hover:border-[#8b7355] transition-all duration-300 shadow-lg group-hover:shadow-xl bg-white">
                          {match ? (
                            <img
                              src={`/api/images/filename/${match.filename}`}
                              alt={cat}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#f5f1e8]">
                              <Lamp className="w-8 h-8 text-[#8b7355]/20" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-serif font-medium text-gray-800 group-hover:text-[#8b7355] transition-colors">{cat}s</span>
                      </div>
                    </Link>
                  )
                })
              })()}
            </div>

            <div className="text-center mt-12">
              <Link href="/luminaires">
                <button className="flex items-center gap-2 px-6 py-3 bg-[#8b7355] text-white rounded-xl font-medium hover:bg-[#75614a] transition-colors shadow-lg mx-auto">
                  Explorer la collection
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Separateur */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-[#8b7355]/20 to-transparent" />
        </div>

        {/* Section Designers */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-sm font-medium text-[#8b7355] uppercase tracking-wider mb-4 block">Designers</span>
              <h2 className="text-3xl md:text-4xl font-serif text-gray-900 text-balance">
                Les grands maitres du luminaire
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {previewDesigners.slice(0, 4).map((designer: any, i: number) => {
                const name = designer.nom || designer.Nom || designer.name || "Designer"
                const bio = designer.description || designer.biographie || ""
                return (
                  <Link key={i} href={`/designers/${encodeURIComponent(name)}`}>
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden group cursor-pointer">
                      {designer.image ? (
                        <img
                          src={designer.image}
                          alt={name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[#8b7355]/20 flex items-center justify-center">
                          <Users className="w-10 h-10 text-[#8b7355]/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-colors" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10">
                        <h3 className="text-base md:text-lg font-serif font-bold text-white leading-tight">{name}</h3>
                        {bio && (
                          <p className="text-white/50 text-[10px] md:text-xs mt-1 line-clamp-1">{bio.substring(0, 60)}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="text-center mt-10">
              <Link href="/designers">
                <button className="flex items-center gap-2 px-6 py-3 bg-[#8b7355] text-white rounded-xl font-medium hover:bg-[#75614a] transition-colors shadow-lg mx-auto">
                  Decouvrir les designers
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Separateur */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-[#8b7355]/20 to-transparent" />
        </div>

        {/* Section Chronologie */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-sm font-medium text-[#8b7355] uppercase tracking-wider mb-4 block">Chronologie</span>
              <h2 className="text-3xl md:text-4xl font-serif text-gray-900 text-balance">
                Un voyage a travers les epoques
              </h2>
            </div>

            {/* Carousel: image principale au centre + vignettes scrollables */}
            {(() => {
              const periods = [
                { name: "Moyen-Age", years: "1000 - 1499", start: 1000, end: 1499 },
                { name: "Renaissance", years: "1500 - 1599", start: 1500, end: 1599 },
                { name: "Baroque", years: "1600 - 1714", start: 1600, end: 1714 },
                { name: "Neoclassique", years: "1715 - 1789", start: 1715, end: 1789 },
                { name: "Empire", years: "1800 - 1850", start: 1800, end: 1850 },
                { name: "Art Nouveau", years: "1890 - 1910", start: 1890, end: 1910 },
                { name: "Art Deco", years: "1920 - 1940", start: 1920, end: 1940 },
                { name: "Moderne", years: "1950 - 1969", start: 1950, end: 1969 },
                { name: "Contemporain", years: "1970 - auj.", start: 1970, end: 2030 },
              ].map(p => {
                const pLum = luminaires.filter((l: any) => {
                  const y = parseInt(l.annee || l["Année"] || l.year)
                  return !isNaN(y) && y >= p.start && y <= p.end && l.filename
                })
                return { ...p, sample: pLum[0], count: pLum.length }
              })
              const activeIdx = typeof window !== "undefined" ? undefined : 0
              return <ChronoCarousel periods={periods} />
            })()}
            

          </div>
        </section>

        {/* Separateur */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-[#8b7355]/20 to-transparent" />
        </div>

        {/* Section Prix / Abonnement */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 bg-white rounded-2xl p-6 shadow-xl border-2 border-[#8b7355]/30">
                <div className="text-center mb-4">
                  <span className="inline-block bg-[#8b7355] text-white text-xs px-3 py-1 rounded-full font-medium mb-3">
                    Recommande
                  </span>
                  <h3 className="text-2xl font-serif text-gray-900">Premium</h3>
                  <p className="text-sm text-gray-500 mt-1">Acces complet a toutes les fonctionnalites</p>
                </div>
                <div className="text-center py-4">
                  <span className="text-4xl font-bold text-gray-900">30</span>
                  <span className="text-lg text-gray-500 ml-1">EUR/mois</span>
                </div>
                <div className="space-y-2 mt-2">
                  {[
                    "Collection complete de luminaires",
                    "Recherche IA illimitee",
                    "Suppression arriere-plan",
                    "Export PDF des fiches",
                    "Favoris et estimation de prix",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-4 h-4 rounded-full bg-[#8b7355]/10 flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#8b7355]" />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>

              </div>
              <div className="order-1 md:order-2">
                <span className="text-sm font-medium text-[#8b7355] uppercase tracking-wider mb-4 block">Abonnement</span>
                <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4 text-balance">
                  Debloquez tout le potentiel
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Avec l'abonnement Premium, accedez a l'integralite de la collection, a la recherche IA illimitee, 
                  a la suppression d'arriere-plan, aux exports PDF et a bien d'autres fonctionnalites exclusives. 
                  Profitez de 2 mois offerts avec l'abonnement annuel.
                </p>
                <Link href="/pricing">
                  <button className="flex items-center gap-2 px-6 py-3 bg-[#8b7355] text-white rounded-xl font-medium hover:bg-[#75614a] transition-colors shadow-lg">
                    Voir les forfaits
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer de la page */}
        <div className="py-10 text-center text-sm text-gray-400">
          <p className="font-serif">Luminaires - Du Moyen-Age a nos jours</p>
        </div>

      </div>

      {/* Modal de connexion */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      <MobileFooter />
    </div>
  )
}
