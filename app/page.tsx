"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Camera, Upload, X, Sparkles } from "lucide-react"
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

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { user, userData, incrementSearchCount, canSearch } = useAuth()

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

      // Nettoyer l'image_id
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

      // CORRECTION: Chercher par filename dans la base MongoDB
      const localMatch = luminaires.find((luminaire: any) => {
        const localFilename = (luminaire.filename || luminaire["Nom du fichier"] || "").toLowerCase()
        const searchFilename = cleanImageId.toLowerCase()
        // Correspondance exacte par filename
        return localFilename === searchFilename || localFilename.includes(searchFilename.replace(/\.[^/.]+$/, ""))
      })

      console.log(`🔍 Recherche: "${cleanImageId}" → ${localMatch ? `✅ Trouvé: ${localMatch._id}` : "❌ Pas trouvé"}`)

      return {
        imageId: cleanImageId,
        imageUrl: finalImageUrl,
        // CORRECTION: Utiliser l'ID MongoDB pour créer le lien vers la page luminaire
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
    // Vérifier si l'utilisateur peut effectuer une recherche
    if (!canSearch) {
      toast.error("Limite de recherches quotidiennes atteinte (3/3)")
      return
    }

    // Pour les utilisateurs non connectés, afficher la modal de connexion
    if (!user) {
      setShowLoginModal(true)
      return
    }

    // Incrémenter le compteur de recherches pour les utilisateurs "free"
    if (userData?.role === "free") {
      const canProceed = await incrementSearchCount()
      if (!canProceed) return
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
    // CORRECTION: Charger les luminaires depuis l'API MongoDB
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

    // CORRECTION: Charger la vidéo d'accueil depuis l'API
    const loadWelcomeVideo = async () => {
      try {
        const response = await fetch("/api/welcome-video")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.video) {
            const videoUrl = `/api/videos/${data.video._id}`
            setWelcomeVideo(videoUrl)
            console.log("🎥 Vidéo de bienvenue chargée:", videoUrl)
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement de la vidéo:", error)
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

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Vidéo de fond */}
      {welcomeVideo ? (
        <video
          autoPlay
          muted
          loop
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            console.log("❌ Erreur chargement vidéo:", welcomeVideo)
            e.currentTarget.style.display = "none"
          }}
        >
          <source src={welcomeVideo} type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      )}

      {/* Overlay élégant */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80" />

      {/* Contenu principal */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-6 leading-tight">
            Luminaires d'Exception
            <br />
            <span className="text-2xl md:text-3xl text-slate-300 font-light">du Moyen Âge à nos jours</span>
          </h1>
          <p className="text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed">
            Découvrez une collection unique de luminaires historiques grâce à l'intelligence artificielle
          </p>
        </div>

        {/* Zone de recherche par image */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-6 md:p-10 max-w-lg w-full shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-slate-700 mr-3" />
              <h2 className="text-2xl md:text-3xl font-serif text-slate-800">Recherche IA</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Photographiez ou téléversez une image pour découvrir des luminaires similaires dans notre collection
            </p>
          </div>

          {/* Message pour les utilisateurs "free" */}
          {userData?.role === "free" && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="flex items-center text-sm text-blue-800">
                <span className="mr-2">ℹ️</span>
                <span>Compte gratuit : {3 - (userData.searchCount || 0)}/3 recherches restantes aujourd'hui</span>
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
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 text-lg rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                disabled={isSearching || !canSearch}
              >
                <Upload className="w-5 h-5 mr-3" />
                Téléverser une image
              </Button>

              <Button
                onClick={startCamera}
                variant="outline"
                className="w-full border-2 border-slate-300 text-slate-700 hover:bg-slate-50 py-4 text-lg rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl bg-transparent"
                disabled={isSearching || isCameraLoading || !canSearch}
              >
                {isCameraLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-700 mr-3"></div>
                    Activation caméra...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-3" />
                    Prendre une photo
                  </>
                )}
              </Button>

              {!canSearch && userData?.role === "free" && (
                <div className="text-center text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  Limite de recherches quotidiennes atteinte (3/3).
                  <Link href="#" className="ml-1 underline font-medium">
                    Passez à Premium
                  </Link>{" "}
                  pour des recherches illimitées.
                </div>
              )}

              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Notre IA analyse votre image et trouve les 10 luminaires les plus similaires dans notre collection
              </p>
            </div>
          )}

          {/* Étape 2a: Caméra en cours d'activation */}
          {searchMode === "camera" && isCameraLoading && (
            <div className="space-y-6 text-center">
              <div className="w-full h-64 bg-slate-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-slate-700 mx-auto mb-4"></div>
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
                <div className="absolute bottom-3 left-3 bg-green-500 text-white text-sm px-3 py-2 rounded-lg z-10 shadow-lg">
                  🟢 Touchez l'écran pour capturer
                </div>
              </div>

              {/* Boutons de contrôle */}
              <div className="flex gap-3">
                <Button
                  onClick={capturePhoto}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl"
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
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-slate-700 mx-auto mb-4"></div>
                <p className="text-lg font-medium text-slate-800 mb-2">Analyse IA en cours...</p>
                <p className="text-sm text-slate-600">Recherche des luminaires similaires dans notre collection</p>
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
                <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="removeBackground"
                    className="w-5 h-5 text-slate-700 bg-white border-slate-300 rounded focus:ring-slate-500 focus:ring-2"
                    onChange={async (e) => {
                      if (e.target.checked) {
                        // Supprimer l'arrière-plan et mettre à jour l'affichage
                        if (selectedImageForSearch && !isRemovingBackground) {
                          const processedFile = await removeBackground(selectedImageForSearch)
                          if (processedFile && backgroundRemovedImage) {
                            setSelectedImageForSearch(processedFile)
                            setCapturedImage(backgroundRemovedImage)
                          }
                        }
                      } else {
                        // Remettre l'image originale
                        if (selectedFile) {
                          const originalUrl = URL.createObjectURL(selectedFile)
                          setCapturedImage(originalUrl)
                          setSelectedImageForSearch(selectedFile)
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

                {isRemovingBackground && (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-slate-700 mx-auto mb-3"></div>
                    <p className="text-sm text-slate-600">Suppression de l'arrière-plan en cours...</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={searchWithOriginal}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl"
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
                La suppression d'arrière-plan peut améliorer la précision de la recherche
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
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-lg"
                  size="sm"
                  disabled={isSearching || !canSearch}
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

      {/* Modal de connexion */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  )
}
