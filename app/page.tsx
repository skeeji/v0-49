"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import { Camera, Upload, X, Lamp, Users, Clock, CreditCard, ArrowRight, Search, Grid3x3, ChevronLeft, ChevronRight, Send, ImageIcon, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ChronoCarousel } from "@/components/chrono-carousel"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"
import MobileFooter from "@/components/MobileFooter" // Import MobileFooter
// import { CorridorGallery } from "@/components/CorridorGallery"  // ← rollback: décommenter cette ligne et commenter la suivante
import { FloatingGallery } from "@/components/FloatingGallery"

// URL correcte de l'API
const apiUrl = "https://image-similarity-api-590690354412.us-central1.run.app/api/search"
const API_BASE_URL_TEXT = "https://chatbot-984654216979.europe-west1.run.app"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  results?: any[]
  timestamp: Date
}

export default function HomePage() {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [previewDesigners, setPreviewDesigners] = useState<any[]>([])
  const [welcomeVideo, setWelcomeVideo] = useState("")
  const [homepageImages, setHomepageImages] = useState<Record<string, string>>({})
  const [homepageMeta, setHomepageMeta] = useState<Record<string, any>>({})
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
  
  // États chatbot
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isChatSearching, setIsChatSearching] = useState(false)
  const [chatSearchContext, setChatSearchContext] = useState("")
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

  // États pour les restrictions
  // const [searchCount, setSearchCount] = useState(0)
  // const [monthlySearchLimit] = useState(3)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { user, userData, incrementSearchCount } = useAuth()

  // Map filename → luminaire pour éviter O(n) dans processApiResults
  const luminairesMap = useMemo(() => {
    const map = new Map<string, any>()
    for (const l of luminaires) {
      const fn = (l.filename || l["Nom du fichier"] || "").toLowerCase()
      if (fn) map.set(fn, l)
    }
    return map
  }, [luminaires])

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

      // Chercher par filename dans la base MongoDB via Map O(1)
      const localMatch = luminairesMap.get(cleanImageId.toLowerCase())

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
      console.log("��️ URL de prévisualisation créée pour upload")
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
      console.log(`������ Dimensions vidéo: ${video.videoWidth} x ${video.videoHeight}`)

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

  // === FONCTIONS CHATBOT ===
  const enrichChatResultsWithIds = async (results: any[]) => {
    const enriched = await Promise.all(
      results.map(async (result) => {
        const luminaireId = result.luminaireId || result.luminaire_id
        const fileName = luminaireId?.split("/").pop()?.toLowerCase() || luminaireId
        let mongoId = null

        if (fileName) {
          try {
            const response = await fetch(`/api/luminaire-by-image?filename=${encodeURIComponent(fileName)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.found) {
                mongoId = data.luminaireId
              }
            }
          } catch (error) {
            console.error("[v0] Error fetching MongoDB ID:", error)
          }
        }

        const imageUrl = result.imageUrl || result.image_url || `/api/images/filename/${fileName}`

        return {
          imageUrl,
          luminaireUrl: mongoId ? `/luminaires/${mongoId}` : null,
          luminaireId: mongoId,
          nom: result.nom || "Sans nom",
          artiste: result.artiste || "Inconnu",
          annee: result.annee === null || result.annee === "" ? "Non spécifié" : String(result.annee),
          similarity: result.similarity || 0,
        }
      }),
    )
    return enriched
  }

  const handleChatSearch = async () => {
    if (!chatInput.trim()) return

    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche")
      setShowLoginModal(true)
      return
    }

    if (userData?.role !== "premium" && userData?.role !== "admin") {
      toast.error("Cette fonctionnalité est réservée aux membres Premium")
      return
    }

    const newContext = chatSearchContext ? `${chatSearchContext}, ${chatInput}` : chatInput

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setIsChatSearching(true)

    try {
      const response = await fetch(`${API_BASE_URL_TEXT}/api/search_text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: newContext, top_k: 3 }),
      })

      if (!response.ok) throw new Error("Erreur lors de la recherche")

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = JSON.parse(text.replace(/:\s*NaN/g, ": null"))
      }

      if (data.results && data.results.length > 0) {
        const enrichedResults = await enrichChatResultsWithIds(data.results)

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `J'ai trouvé ${enrichedResults.length} luminaire(s) correspondant à votre recherche :`,
          results: enrichedResults,
          timestamp: new Date(),
        }

        setChatMessages((prev) => [...prev, assistantMessage])
        setChatSearchContext(newContext)
        toast.success(`${enrichedResults.length} luminaire(s) trouvé(s)`)
      } else {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Je n'ai trouvé aucun luminaire correspondant à votre recherche. Essayez une autre description.",
          timestamp: new Date(),
        }

        setChatMessages((prev) => [...prev, assistantMessage])
        setChatSearchContext(newContext)
        toast.info("Aucun résultat trouvé")
      }
    } catch (error) {
      console.error("[v0] Chat search error:", error)
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Désolé, une erreur s'est produite lors de la recherche. Veuillez réessayer.",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, assistantMessage])
      toast.error("Erreur lors de la recherche")
    } finally {
      setIsChatSearching(false)
    }
  }

  const resetChat = () => {
    setChatMessages([])
    setChatInput("")
    setChatSearchContext("")
  }

  useEffect(() => {
    if (chatMessages.length === 0) return
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    // Charger les luminaires depuis l'API MongoDB
    const loadLuminaires = async () => {
      try {
        const response = await fetch("/api/luminaires-light") // Payload optimisé (filename, _id)
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
    const knownNames = ["Starck", "Tom Dixon", "Royere", "Ingo Maurer", "Flos", "Artemide", "Le Corbusier", "Charlotte Perriand", "Serge Mouille", "Jean Prouve"]
    const results: any[] = []
    const allResponses = await Promise.all(
      knownNames.map(async (name) => {
        try {
          const res = await fetch(`/api/designers?search=${encodeURIComponent(name)}&limit=1`)
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.designers.length > 0) return data.designers[0]
          }
        } catch {}
        return null
      })
    )
    for (const d of allResponses) {
      if (results.length >= 6) break
      if (d && d.image && !results.find((r: any) => r.id === d.id)) results.push(d)
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

    // Charger images personnalisees accueil
    fetch("/api/homepage-images")
      .then(r => r.json())
      .then(data => {
        if (data.success && data.images) setHomepageImages(data.images)
        if (data.success && data.metadata) setHomepageMeta(data.metadata)
      })
      .catch(() => {})

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
      {/* ========== GALERIE FLOTTANTE ========== */}
      {/* rollback → remplacer FloatingGallery par : <CorridorGallery videoUrl={welcomeVideo} /> */}
      <FloatingGallery apiUrl={apiUrl} />


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
                  const pickIdx = Math.min(6 + i * 5, matches.length - 1)
                  const match = matches[Math.max(0, pickIdx)] || matches[0]
                  if (match) usedIds.add(match._id)
                  const lumOverride = homepageImages[`homepage_luminaire_${i}`]
                  return (
                    <Link key={i} href={`/luminaires?categorie=${encodeURIComponent(cat)}`} className="group">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-[#8b7355]/20 group-hover:border-[#8b7355] transition-all duration-300 shadow-lg group-hover:shadow-xl bg-white">
                          {(lumOverride || match) ? (
                            <img
                              src={lumOverride || `/api/images/filename/${match.filename}`}
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
              {Array.from({ length: 4 }).map((_, i) => {
                const overrideKey = `homepage_designer_${i}`
                const overrideSrc = homepageImages[overrideKey]
                const meta = homepageMeta[overrideKey]
                const overrideName = meta?.designerName || null

                // Use override designer name to find info in DB results, or fall back to previewDesigners list
                let designer: any = null
                let name = "Designer"
                let bio = ""

                if (overrideName) {
                  designer = previewDesigners.find((d: any) => {
                    const dName = (d.nom || d.Nom || d.name || "").toLowerCase()
                    return dName.includes(overrideName.toLowerCase()) || overrideName.toLowerCase().includes(dName)
                  })
                  name = overrideName
                  bio = designer?.description || designer?.biographie || ""
                } else {
                  const fallback = previewDesigners.filter((d: any) => d.image)
                  designer = fallback[i]
                  if (!designer) return null
                  name = designer.nom || designer.Nom || designer.name || "Designer"
                  bio = designer.description || designer.biographie || ""
                }

                const imgSrc = overrideSrc || designer?.image
                if (!imgSrc) return null

                return (
                  <Link key={i} href={`/designers/${encodeURIComponent(name)}`}>
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden group cursor-pointer">
                      <img
                        src={imgSrc}
                        alt={name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-colors" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10">
                        <h3 className="text-base md:text-lg font-serif font-bold text-[#f5e6c8] leading-tight">{name}</h3>
                        {bio && (
                          <p className="text-[#d4c4a0]/80 text-[10px] md:text-xs mt-1 line-clamp-1">{bio.substring(0, 60)}</p>
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
                const sampleIdx = Math.min(6, pLum.length - 1)
                return { ...p, sample: pLum[Math.max(0, sampleIdx)] || pLum[0], count: pLum.length }
              })
              return <ChronoCarousel periods={periods} homepageImages={homepageImages} />
            })()}
            

            <div className="text-center mt-10">
              <Link href="/chronologie">
                <button className="flex items-center gap-2 px-6 py-3 bg-[#8b7355] text-white rounded-xl font-medium hover:bg-[#75614a] transition-colors shadow-lg mx-auto">
                  Explorer la chronologie complete
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
