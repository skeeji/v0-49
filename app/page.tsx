"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Camera, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/useToast"
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
  const { showToast } = useToast()
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
    } catch (error) {
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

      // Chercher par filename
      const localMatch = luminaires.find((luminaire: any) => {
        const localFilename = (luminaire.filename || "").toLowerCase()
        const searchFilename = cleanImageId.toLowerCase()

        // Correspondance exacte par filename
        return localFilename === searchFilename || localFilename.includes(searchFilename.replace(/\.[^/.]+$/, ""))
      })

      console.log(`🔍 Recherche: "${cleanImageId}" → ${localMatch ? `✅ Trouvé: ${localMatch.id}` : "❌ Pas trouvé"}`)

      const slug = cleanImageId.replace(/\.[^/.]+$/, "")

      return {
        imageId: cleanImageId,
        slug: slug,
        imageUrl: finalImageUrl,
        ficheUrl: `/fiche-produit/${slug}`,
        luminaireUrl: localMatch ? `/luminaires/${localMatch.id}` : null,
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

        showToast("Arrière-plan supprimé avec succès!", "success")
        return pngFile
      } else {
        const errorText = await response.text()
        console.error("❌ Erreur API remove.bg:", response.status, errorText)
        showToast("Erreur lors de la suppression d'arrière-plan", "error")
        return null
      }
    } catch (error) {
      console.error("💥 Erreur suppression arrière-plan:", error)
      showToast("Erreur lors de la suppression d'arrière-plan", "error")
      return null
    } finally {
      setIsRemovingBackground(false)
    }
  }

  const handleImageSearch = async (file: File) => {
    // Vérifier si l'utilisateur peut effectuer une recherche
    if (!canSearch) {
      showToast("Limite de recherches quotidiennes atteinte (3/3)", "error")
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
          showToast(`${processedResults.length} luminaire(s) similaire(s) trouvé(s)`, "success")
        } else {
          showToast("Aucun résultat trouvé", "info")
        }
      } else {
        console.log(`❌ API échouée: ${apiResponse.type}`)
        showToast("Erreur lors de l'appel à l'API IA", "error")
      }
    } catch (error) {
      console.error("💥 Erreur générale:", error)
      showToast("Erreur lors de la recherche", "error")
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
          showToast("Caméra activée - Touchez l'écran pour capturer", "success")
        }
      }, 100)
    } catch (error) {
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

      showToast(errorMessage, "error")
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
      showToast("Photo capturée - Recherche en cours...", "success")

      // Afficher les options d'arrière-plan
      setShowBackgroundOptions(true)
      setSelectedImageForSearch(file)
    } catch (error) {
      console.error("💥 === ERREUR CAPTURE ===", error)
      showToast(`Erreur capture: ${error.message}`, "error")
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
      showToast("Aucune image disponible pour la recherche", "error")
    }
  }

  const searchWithOriginal = () => {
    if (selectedImageForSearch) {
      setShowBackgroundOptions(false)
      handleImageSearch(selectedImageForSearch)
    }
  }

  useEffect(() => {
    // Charger les luminaires depuis localStorage
    const storedLuminaires = localStorage.getItem("luminaires")
    if (storedLuminaires) {
      const data = JSON.parse(storedLuminaires)
      console.log(`📊 ${data.length} luminaires chargés pour la recherche IA`)
      setLuminaires(data)
    }

    // Charger la vidéo d'accueil
    const storedVideo = localStorage.getItem("welcomeVideo")
    if (storedVideo) {
      setWelcomeVideo(storedVideo)
    }

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
        <video autoPlay muted loop className="absolute inset-0 w-full h-full object-cover">
          <source src={welcomeVideo} type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-orange to-gold" />
      )}

      {/* Overlay orangé */}
      <div className="absolute inset-0 bg-orange opacity-60" />

      {/* Contenu principal */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen container-responsive">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-playfair text-white mb-4 leading-tight">
            Luminaires du Moyen Âge
            <br />à nos jours
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Découvrez des luminaires de toutes époques et styles
          </p>
        </div>

        {/* Zone de recherche par image */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 md:p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-xl md:text-2xl font-playfair text-dark mb-4 md:mb-6 text-center">
            Recherche par image IA
          </h2>

          {/* Message pour les utilisateurs "free" */}
          {userData?.role === "free" && (
            <div className="mb-4 p-2 bg-blue-50 rounded-lg text-xs text-blue-800">
              <p className="flex items-center">
                <span className="mr-1">ℹ️</span>
                <span>Compte gratuit : {3 - (userData.searchCount || 0)}/3 recherches restantes aujourd'hui</span>
              </p>
            </div>
          )}

          {/* Espace pour les instructions */}
          <div className="mb-4 text-center">
            <p className="text-xs md:text-sm text-gray-600">
              Prenez une photo ou téléversez une image pour trouver des luminaires similaires
            </p>
          </div>

          {/* Affichage de l'image après recherche */}
          {capturedImage && !isSearching && searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2 text-center">Image analysée :</h3>
              <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden max-w-48 mx-auto">
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
            className={`w-full rounded-lg bg-black cursor-pointer ${
              searchMode === "camera" && isCameraActive && !capturedImage ? "block" : "hidden"
            }`}
            style={{ aspectRatio: "4/3" }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Étape 1: Sélection de la méthode */}
          {!searchMode && !capturedImage && !isSearching && (
            <div className="space-y-3 md:space-y-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-orange hover:bg-orange/90 text-white py-3 md:py-4 text-base md:text-lg"
                disabled={isSearching || !canSearch}
              >
                <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Téléverser une image
              </Button>

              <Button
                onClick={startCamera}
                variant="outline"
                className="w-full border-orange text-orange hover:bg-orange hover:text-white py-3 md:py-4 text-base md:text-lg"
                disabled={isSearching || isCameraLoading || !canSearch}
              >
                {isCameraLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange mr-2"></div>
                    Activation caméra...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Prendre une photo
                  </>
                )}
              </Button>

              {!canSearch && userData?.role === "free" && (
                <div className="text-center text-red-500 text-xs">
                  Limite de recherches quotidiennes atteinte (3/3).
                  <Link href="#" className="ml-1 underline">
                    Passez à Premium
                  </Link>{" "}
                  pour des recherches illimitées.
                </div>
              )}

              <p className="text-xs text-gray-600 text-center">
                L'IA analyse votre image et trouve les 10 luminaires les plus similaires
              </p>
            </div>
          )}

          {/* Étape 2a: Caméra en cours d'activation */}
          {searchMode === "camera" && isCameraLoading && (
            <div className="space-y-4 text-center">
              <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Activation de la caméra...</p>
                </div>
              </div>

              <Button onClick={resetSearch} variant="outline" className="w-full">
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          )}

          {/* Étape 2b: Caméra active */}
          {searchMode === "camera" && isCameraActive && !capturedImage && (
            <div className="space-y-4">
              {/* Le flux vidéo est maintenant rendu en haut avec une classe conditionnelle */}

              {/* Overlay avec instructions */}
              <div className="relative -mt-4">
                {/* Indicateur de statut */}
                <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded z-10">
                  🟢 Touchez l'écran pour capturer
                </div>

                {/* Pas d'indicateur supplémentaire */}
              </div>

              {/* Boutons de contrôle */}
              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1 bg-orange hover:bg-orange/90" disabled={isCapturing}>
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

                <Button onClick={resetSearch} variant="outline" className="px-4" disabled={isCapturing}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-xs text-gray-600 text-center">
                Cadrez le luminaire et touchez l'écran ou le bouton pour capturer
              </p>
            </div>
          )}

          {/* Étape 3: Recherche en cours */}
          {isSearching && (
            <div className="space-y-4 text-center">
              {capturedImage && (
                <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <Image
                    src={capturedImage || "/placeholder.svg"}
                    alt="Image en cours d'analyse"
                    fill
                    className="object-contain"
                  />
                </div>
              )}

              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange mx-auto mb-2"></div>
                <p className="text-sm font-medium text-dark">Analyse IA en cours...</p>
                <p className="text-xs text-gray-500">Recherche des luminaires similaires</p>
              </div>
            </div>
          )}

          {/* Étape 2.5: Options d'arrière-plan */}
          {showBackgroundOptions && !isSearching && (
            <div className="space-y-4">
              <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-4">
                <Image src={capturedImage || "/placeholder.svg"} alt="Image capturée" fill className="object-contain" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="removeBackground"
                    className="w-4 h-4 text-orange bg-gray-100 border-gray-300 rounded focus:ring-orange focus:ring-2"
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
                  <label htmlFor="removeBackground" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Supprimer l'arrière-plan avant la recherche
                  </label>
                </div>

                {isRemovingBackground && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Suppression de l'arrière-plan en cours...</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={searchWithOriginal}
                    className="flex-1 bg-orange hover:bg-orange/90"
                    disabled={isRemovingBackground}
                  >
                    Rechercher maintenant
                  </Button>
                  <Button onClick={resetSearch} variant="outline" className="px-4">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-gray-600 text-center">
                La suppression d'arrière-plan peut améliorer la précision de la recherche
              </p>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="mt-6 md:mt-8 bg-white/95 backdrop-blur-sm rounded-2xl p-4 md:p-6 max-w-6xl w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-3">
              <h3 className="text-lg md:text-xl font-playfair text-dark text-center md:text-left">
                🎯 Top {searchResults.length} luminaires similaires (IA)
              </h3>
              <div className="flex gap-2 justify-center md:justify-end">
                <Button
                  onClick={searchAgain}
                  className="bg-orange hover:bg-orange/90 text-sm md:text-base"
                  size="sm"
                  disabled={isSearching || !canSearch}
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                  ) : (
                    <span>🔄 Refaire la recherche</span>
                  )}
                </Button>
                <Button onClick={resetSearch} variant="outline" size="sm" className="text-sm md:text-base">
                  <X className="w-4 h-4 mr-2" />
                  Nouvelle image
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {searchResults.map((result: any, index) => (
                <div key={index} className="bg-white rounded-lg p-2 md:p-3 shadow-md border">
                  {/* Image cliquable */}
                  <Link href={result.hasLocalMatch ? result.luminaireUrl : result.ficheUrl}>
                    <div className="relative w-full h-24 md:h-32 mb-2 md:mb-3 cursor-pointer hover:scale-105 transition-transform">
                      <Image
                        src={result.imageUrl || "/placeholder.svg"}
                        alt={result.imageId || `Résultat ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                        onError={(e) => {
                          const fallbackUrl = `/placeholder.svg?height=200&width=200&text=${encodeURIComponent(result.imageId || `Image ${index + 1}`)}`
                          e.currentTarget.src = fallbackUrl
                        }}
                      />
                    </div>
                  </Link>

                  <p className="text-xs md:text-sm font-medium text-dark truncate mb-1 md:mb-2">
                    {result.metadata?.name || result.imageId || `Résultat ${index + 1}`}
                  </p>
                  <p className="text-xs text-orange mb-2 md:mb-3">Similarité: {Math.round(result.similarity * 100)}%</p>

                  <p className="text-xs text-gray-500">
                    {result.hasLocalMatch ? "Fiche disponible" : "Fiche produit externe"}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 md:mt-4 text-center text-xs md:text-sm text-gray-600">
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
