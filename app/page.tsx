"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Camera, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"
import { Card, CardContent } from "@/components/ui/card"

// URL correcte de l'API
const apiUrl = "https://image-similarity-api-590690354412.us-central1.run.app/api/search"

export default function HomePage() {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [luminaires, setLuminaires] = useState([])
  const [welcomeVideo, setWelcomeVideo] = useState<any>(null)
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
  const [isLoading, setIsLoading] = useState(true)
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
      toast.success("Photo capturée - Recherche en cours...")

      // Afficher les options d'arrière-plan
      setShowBackgroundOptions(true)
      setSelectedImageForSearch(file)
    } catch (error) {
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

    // Ré-initialiser l'input file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    console.log("✅ Réinitialisation terminée")
  }

  // Charger les luminaires et la vidéo de bienvenue au montage
  useEffect(() => {
    const loadData = async () => {
      try {
        // Charger les luminaires
        const luminairesResponse = await fetch("/api/luminaires?limit=1000")
        if (luminairesResponse.ok) {
          const luminairesData = await luminairesResponse.json()
          if (luminairesData.success) {
            const adaptedLuminaires = luminairesData.luminaires.map((l: any) => ({
              id: l._id,
              filename: l.filename || "",
              nom: l.nom || "",
              designer: l.designer || "",
            }))
            setLuminaires(adaptedLuminaires)
            console.log(`📊 ${adaptedLuminaires.length} luminaires chargés pour la recherche`)
          }
        }

        // CORRECTION: Charger la vidéo de bienvenue depuis l'API
        const videoResponse = await fetch("/api/upload/video")
        if (videoResponse.ok) {
          const videoData = await videoResponse.json()
          if (videoData.success && videoData.videos.length > 0) {
            const videoUrl = `/api/images/${videoData.videos[0].fileId}`
            setWelcomeVideo(videoUrl)
            console.log("🎥 Vidéo de bienvenue chargée:", videoUrl)
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error)
      }
    }

    loadData()
  }, [])

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      console.log("🧹 Nettoyage au démontage du composant")
      cleanupCamera()

      if (capturedImage && capturedImage.startsWith("blob:")) {
        URL.revokeObjectURL(capturedImage)
      }

      if (backgroundRemovedImage && backgroundRemovedImage.startsWith("blob:")) {
        URL.revokeObjectURL(backgroundRemovedImage)
      }
    }
  }, [capturedImage, backgroundRemovedImage])

  useEffect(() => {
    async function fetchWelcomeVideo() {
      try {
        console.log("🎥 Chargement de la vidéo de bienvenue...")
        const response = await fetch("/api/welcome-video")
        const result = await response.json()

        console.log("📊 Réponse API vidéo:", result)

        if (result.success && result.video) {
          setWelcomeVideo(result.video)
          console.log("✅ Vidéo de bienvenue chargée")
        } else {
          console.log("ℹ️ Aucune vidéo de bienvenue trouvée")
        }
      } catch (error) {
        console.error("❌ Erreur chargement vidéo:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWelcomeVideo()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-cream">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-playfair text-dark mb-6">Collection Gersaint</h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Découvrez une collection exceptionnelle de luminaires d'art, témoins de l'excellence du design français et
            international
          </p>

          {/* Vidéo de bienvenue */}
          {!isLoading && welcomeVideo && (
            <div className="mb-8 max-w-4xl mx-auto">
              <Card className="overflow-hidden shadow-2xl">
                <CardContent className="p-0">
                  <video controls className="w-full h-auto" poster="/placeholder.jpg" preload="metadata">
                    <source src={`/api/videos/${welcomeVideo._id}`} type="video/mp4" />
                    <p>Votre navigateur ne supporte pas la lecture de vidéos.</p>
                  </video>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/luminaires">
              <Button size="lg" className="bg-dark hover:bg-dark/90 text-white px-8 py-3 text-lg">
                Explorer la Collection
              </Button>
            </Link>
            <Link href="/designers">
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-3 text-lg border-dark text-dark hover:bg-dark hover:text-white bg-transparent"
              >
                Découvrir les Designers
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent>
                <div className="text-4xl mb-4">💡</div>
                <h3 className="text-xl font-semibold mb-3">Luminaires d'Exception</h3>
                <p className="text-gray-600">
                  Une sélection unique de pièces rares et authentiques, chacune avec son histoire et sa provenance
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent>
                <div className="text-4xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold mb-3">Designers Renommés</h3>
                <p className="text-gray-600">
                  Découvrez les œuvres des plus grands noms du design, de l'Art Déco au design contemporain
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent>
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-xl font-semibold mb-3">Expertise & Histoire</h3>
                <p className="text-gray-600">
                  Chaque pièce est documentée avec soin, offrant un aperçu de l'évolution du design luminaire
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-dark text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-playfair mb-6">Plongez dans l'Univers du Design Luminaire</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Explorez notre chronologie interactive et découvrez comment l'art de l'éclairage a évolué à travers les
            décennies
          </p>
          <Link href="/chronologie">
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-dark px-8 py-3 text-lg bg-transparent"
            >
              Découvrir la Chronologie
            </Button>
          </Link>
        </div>
      </section>

      <div className="container-responsive py-8">
        <div className="max-w-4xl mx-auto">
          {/* En-tête */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-playfair text-dark mb-4">Recherche par Image IA</h1>
            <p className="text-xl text-gray-600 mb-8">
              Trouvez des luminaires similaires en prenant une photo ou en téléchargeant une image
            </p>

            {/* Informations utilisateur */}
            {user && userData && (
              <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
                <p className="text-sm text-gray-600">
                  Connecté en tant que <span className="font-medium">{userData.role}</span>
                  {userData.role === "free" && (
                    <span className="ml-2 text-orange">
                      ({userData.searchCount || 0}/3 recherches utilisées aujourd'hui)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Boutons d'action principaux */}
            {!searchMode && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button
                  onClick={startCamera}
                  disabled={isCameraLoading}
                  className="bg-orange hover:bg-orange/90 text-white px-8 py-4 text-lg"
                >
                  <Camera className="w-6 h-6 mr-2" />
                  {isCameraLoading ? "Activation..." : "Prendre une photo"}
                </Button>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-orange text-orange hover:bg-orange hover:text-white px-8 py-4 text-lg"
                >
                  <Upload className="w-6 h-6 mr-2" />
                  Télécharger une image
                </Button>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>
            )}
          </div>

          {/* Interface caméra */}
          {isCameraActive && (
            <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
              <div className="text-center mb-4">
                <h3 className="text-xl font-medium mb-2">Caméra active</h3>
                <p className="text-gray-600">Touchez l'écran pour capturer une photo</p>
              </div>

              <div className="relative max-w-2xl mx-auto">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg shadow-lg cursor-pointer"
                  onClick={capturePhoto}
                  style={{ maxHeight: "70vh" }}
                />

                <canvas ref={canvasRef} className="hidden" />

                {isCapturing && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange mx-auto mb-2"></div>
                      <p className="text-orange font-medium">Capture en cours...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4 mt-6">
                <Button
                  onClick={capturePhoto}
                  disabled={isCapturing}
                  className="bg-orange hover:bg-orange/90 px-8 py-3"
                >
                  {isCapturing ? "Capture..." : "📸 Capturer"}
                </Button>

                <Button onClick={resetSearch} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Prévisualisation et options d'arrière-plan */}
          {capturedImage && showBackgroundOptions && (
            <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
              <h3 className="text-xl font-medium text-center mb-4">Image capturée</h3>

              <div className="max-w-md mx-auto mb-6">
                <img
                  src={capturedImage || "/placeholder.svg"}
                  alt="Image capturée"
                  className="w-full rounded-lg shadow-lg"
                />
              </div>

              <div className="text-center space-y-4">
                <p className="text-gray-600">Voulez-vous supprimer l'arrière-plan pour améliorer la recherche ?</p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={async () => {
                      if (selectedImageForSearch) {
                        const processedFile = await removeBackground(selectedImageForSearch)
                        if (processedFile) {
                          setSelectedImageForSearch(processedFile)
                          handleImageSearch(processedFile)
                        }
                      }
                    }}
                    disabled={isRemovingBackground}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isRemovingBackground ? "Suppression..." : "🎨 Supprimer l'arrière-plan"}
                  </Button>

                  <Button
                    onClick={() => {
                      if (selectedImageForSearch) {
                        handleImageSearch(selectedImageForSearch)
                      }
                    }}
                    className="bg-orange hover:bg-orange/90"
                  >
                    🔍 Rechercher directement
                  </Button>

                  <Button onClick={resetSearch} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    Recommencer
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Indicateur de recherche */}
          {isSearching && (
            <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange mx-auto mb-4"></div>
                <h3 className="text-xl font-medium mb-2">Recherche en cours...</h3>
                <p className="text-gray-600">L'IA analyse votre image pour trouver des luminaires similaires</p>
              </div>
            </div>
          )}

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-medium">Résultats de recherche ({searchResults.length})</h3>
                {canSearchAgain && (
                  <Button onClick={resetSearch} className="bg-orange hover:bg-orange/90">
                    Nouvelle recherche
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.map((result: any) => (
                  <div key={result.index} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="aspect-square mb-3 bg-white rounded-lg overflow-hidden">
                      <img
                        src={result.imageUrl || "/placeholder.svg"}
                        alt={`Résultat ${result.index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=200&width=200&text=Image+non+disponible"
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.localMatch?.nom || result.imageId}
                      </p>

                      {result.localMatch?.designer && (
                        <p className="text-xs text-gray-600 truncate">{result.localMatch.designer}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-orange/10 text-orange px-2 py-1 rounded">
                          {Math.round(result.similarity * 100)}% similaire
                        </span>

                        {result.hasLocalMatch && result.luminaireUrl && (
                          <Link href={result.luminaireUrl}>
                            <Button size="sm" className="bg-orange hover:bg-orange/90 text-xs">
                              Voir détails
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de connexion */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  )
}
