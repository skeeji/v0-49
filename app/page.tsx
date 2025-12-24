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

// URL correcte de l'API
const apiUrl = "https://image-similarity-api-590690354412.us-central1.run.app/api/search"

export default function HomePage() {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [luminaires, setLuminaires] = useState([])
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
      setShowBackgroundOptions(false)
      handleImageSearch(selectedImageForSearch)
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
    <div className="relative min-h-screen overflow-hidden">
      {welcomeVideo ? (
        <video
          autoPlay
          muted
          loop
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            console.error("❌ Erreur lecture vidéo:", e)
          }}
          onLoadStart={() => console.log("🎥 Début chargement vidéo")}
          onLoadedData={() => console.log("✅ Vidéo chargée avec succès")}
        >
          <source src={welcomeVideo} type="video/mp4" />
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-cream via-beige to-beige-dark" />
      )}

      <div className="absolute inset-0 bg-white/20" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif text-gold tracking-tight">Recherche IA</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-border">
          <p className="text-center text-sm text-muted-foreground mb-6 leading-relaxed">
            Photographiez ou téléversez une image pour découvrir des luminaires similaires dans notre collection
          </p>

          {(!user || userData?.role === "free") && (
            <div className="mb-6 p-5 bg-gradient-to-r from-beige to-cream rounded-xl border-2 border-gold/40 shadow-sm">
              <p className="text-base text-foreground/90 leading-relaxed">
                Passez à <span className="font-bold text-gold text-lg">Premium</span> pour des recherches illimitées
              </p>
              <Link
                href="/pricing"
                className="inline-block mt-3 text-gold font-semibold text-base hover:underline hover:text-gold-dark transition-colors"
              >
                Découvrir les forfaits →
              </Link>
            </div>
          )}

          {/* Affichage de l'image après recherche */}
          {capturedImage && !isSearching && searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">Image analysée</h3>
              <div className="aspect-square relative bg-beige rounded-xl overflow-hidden max-w-64 mx-auto">
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
            className={`w-full rounded-xl bg-slate-900 cursor-pointer ${
              searchMode === "camera" && isCameraActive && !capturedImage ? "block" : "hidden"
            }`}
            style={{ aspectRatio: "4/3" }}
          />

          <canvas ref={canvasRef} className="hidden" />

          {!searchMode && !capturedImage && !isSearching && (
            <div className="space-y-3">
              <Button
                onClick={() => {
                  if (!user) {
                    toast.error("Connexion requise pour utiliser la recherche IA")
                    setShowLoginModal(true)
                    return
                  }
                  fileInputRef.current?.click()
                }}
                className="w-full bg-gold hover:bg-gold-dark text-white py-6 text-base rounded-xl transition-all duration-200"
                disabled={isSearching}
              >
                <Upload className="w-5 h-5 mr-2" />
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
                variant="outline"
                className="w-full py-6 text-base rounded-xl border-2 hover:border-gold hover:text-gold transition-all duration-200"
                disabled={isSearching || isCameraLoading || userData?.role === "free"}
              >
                {isCameraLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gold border-t-transparent mr-2"></div>
                    Activation...
                  </>
                ) : userData?.role === "free" ? (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Prendre une photo (Premium)
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Prendre une photo
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Connectez-vous pour utiliser notre IA qui analyse votre image
              </p>
            </div>
          )}

          {/* Caméra en cours d'activation */}
          {searchMode === "camera" && isCameraLoading && (
            <div className="space-y-4 text-center">
              <div className="w-full h-64 bg-beige rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-beige-dark border-t-gold mx-auto mb-3"></div>
                  <p className="text-sm text-muted-foreground">Activation de la caméra...</p>
                </div>
              </div>
              <Button onClick={resetSearch} variant="outline" className="w-full rounded-xl bg-transparent">
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          )}

          {/* Caméra active */}
          {searchMode === "camera" && isCameraActive && !capturedImage && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
                  <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Touchez pour capturer
                  </div>
                </div>
                <div className="absolute top-3 right-3 bg-black/70 text-white text-sm px-3 py-2 rounded-lg z-10">
                  {zoomLevel.toFixed(1)}x
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleZoomOut}
                  size="icon"
                  className="w-12 h-12 rounded-full bg-gold hover:bg-gold-dark text-white"
                  disabled={isCapturing || zoomLevel <= 1}
                >
                  -
                </Button>
                <Button
                  onClick={handleZoomIn}
                  size="icon"
                  className="w-12 h-12 rounded-full bg-gold hover:bg-gold-dark text-white"
                  disabled={isCapturing}
                >
                  +
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={capturePhoto}
                  className="flex-1 bg-gold hover:bg-gold-dark text-white rounded-xl"
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                      Capture...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Capturer
                    </>
                  )}
                </Button>
                <Button
                  onClick={resetSearch}
                  variant="outline"
                  size="icon"
                  className="rounded-xl bg-transparent"
                  disabled={isCapturing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Recherche en cours */}
          {isSearching && (
            <div className="space-y-4 text-center">
              {capturedImage && (
                <div className="aspect-square relative bg-beige rounded-xl overflow-hidden mb-4">
                  <Image
                    src={capturedImage || "/placeholder.svg"}
                    alt="Analyse en cours"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-beige-dark border-t-gold mx-auto mb-3"></div>
                <p className="font-medium text-foreground mb-1">Analyse IA en cours...</p>
                <p className="text-sm text-muted-foreground">Recherche des luminaires similaires</p>
              </div>
            </div>
          )}

          {/* Options d'arrière-plan */}
          {showBackgroundOptions && !isSearching && (
            <div className="space-y-4">
              <div className="aspect-square relative bg-beige rounded-xl overflow-hidden mb-4">
                <Image src={capturedImage || "/placeholder.svg"} alt="Image capturée" fill className="object-contain" />
              </div>

              {user && userData?.role !== "free" && (
                <div className="flex items-center space-x-3 p-4 bg-beige rounded-xl border border-border">
                  <input
                    type="checkbox"
                    id="removeBackground"
                    className="w-5 h-5 rounded focus:ring-2 focus:ring-gold accent-gold"
                    onChange={async (e) => {
                      if (e.target.checked) {
                        if (selectedImageForSearch && !isRemovingBackground) {
                          const processedFile = await removeBackground(selectedImageForSearch)
                          if (processedFile && backgroundRemovedImage) {
                            setSelectedImageForSearch(processedFile)
                            setCapturedImage(backgroundRemovedImage)
                          }
                        }
                      } else {
                        if (selectedFile) {
                          const originalUrl = URL.createObjectURL(selectedFile)
                          setCapturedImage(originalUrl)
                          setSelectedImageForSearch(selectedFile)
                          if (backgroundRemovedImage) {
                            URL.revokeObjectURL(backgroundRemovedImage)
                            setBackgroundRemovedImage(null)
                          }
                        }
                      }
                    }}
                    disabled={isRemovingBackground}
                  />
                  <label htmlFor="removeBackground" className="text-sm text-foreground cursor-pointer flex-1">
                    Supprimer l'arrière-plan
                  </label>
                </div>
              )}

              {(!user || userData?.role === "free") && (
                <div className="p-4 bg-beige rounded-xl border border-gold/20">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-gold">Fonctionnalité Premium :</span> Suppression d'arrière-plan
                    <Link href="/pricing" className="block mt-1 text-gold hover:underline">
                      Voir les forfaits →
                    </Link>
                  </p>
                </div>
              )}

              {isRemovingBackground && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-beige-dark border-t-gold mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Suppression en cours...</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={searchWithOriginal}
                  className="flex-1 bg-gold hover:bg-gold-dark text-white rounded-xl"
                  disabled={isRemovingBackground}
                >
                  Rechercher
                </Button>
                <Button onClick={resetSearch} variant="outline" size="icon" className="rounded-xl bg-transparent">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl p-6 md:p-8 max-w-6xl w-full shadow-xl border border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h3 className="text-xl md:text-2xl font-serif text-foreground">
                J'ai trouvé {searchResults.length} luminaire(s) correspondant à votre recherche :
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={searchAgain}
                  size="sm"
                  variant="outline"
                  className="rounded-lg hover:border-gold hover:text-gold bg-transparent"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold border-t-transparent mr-2"></div>
                  ) : (
                    <span>Refaire</span>
                  )}
                </Button>
                <Button onClick={resetSearch} size="sm" variant="outline" className="rounded-lg bg-transparent">
                  <X className="w-4 h-4 mr-1" />
                  Nouvelle
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((result: any, index) => (
                <div key={index} className="group">
                  {result.hasLocalMatch && result.luminaireUrl ? (
                    <Link href={result.luminaireUrl}>
                      <div className="bg-cream rounded-xl overflow-hidden border border-border hover:shadow-lg transition-all duration-300">
                        <div className="relative w-full h-48 bg-white">
                          <Image
                            src={result.imageUrl || "/placeholder.svg"}
                            alt={result.imageId || `Résultat ${index + 1}`}
                            fill
                            className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.src = `/placeholder.svg?height=200&width=200&text=${encodeURIComponent(result.imageId || "Image")}`
                            }}
                          />
                        </div>
                        <div className="p-4">
                          <p className="font-medium text-foreground truncate mb-1">
                            {result.localMatch?.nom || result.imageId || `Résultat ${index + 1}`}
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">
                            {result.localMatch?.artiste || "Designer inconnu"}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gold font-medium">
                              Similarité: {Math.round(result.similarity * 100)}%
                            </span>
                            <span className="text-xs text-muted-foreground">Voir la fiche →</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-cream rounded-xl overflow-hidden border border-border">
                      <div className="relative w-full h-48 bg-white">
                        <Image
                          src={result.imageUrl || "/placeholder.svg"}
                          alt={result.imageId || `Résultat ${index + 1}`}
                          fill
                          className="object-contain p-4"
                          onError={(e) => {
                            e.currentTarget.src = `/placeholder.svg?height=200&width=200&text=${encodeURIComponent(result.imageId || "Image")}`
                          }}
                        />
                      </div>
                      <div className="p-4">
                        <p className="font-medium text-foreground truncate mb-1">
                          {result.imageId || `Résultat ${index + 1}`}
                        </p>
                        <p className="text-sm text-muted-foreground">Image similaire</p>
                        <p className="text-xs text-gold mt-2">Similarité: {Math.round(result.similarity * 100)}%</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de connexion */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  )
}
