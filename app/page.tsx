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
import { CorridorGallery } from "@/components/CorridorGallery"

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
      {/* ========== GALERIE IMMERSIVE 3D ========== */}
      <CorridorGallery videoUrl={welcomeVideo} />

      {/* Hero section - Recherche IA */}
      <div className="relative py-12 md:py-20">
        {/* Background decoratif */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f5f1e8] via-white to-[#f5f1e8]" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(139, 115, 85, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(139, 115, 85, 0.08) 0%, transparent 50%)" }} />

        {/* Contenu principal */}
        <div className="relative z-10 px-4 md:px-8">
          {/* Header elegant */}
          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8b7355]/10 mb-4">
              <Search className="w-4 h-4" style={{ color: "#8b7355" }} />
              <span className="text-sm font-medium" style={{ color: "#8b7355" }}>Intelligence Artificielle</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif leading-tight mb-3 text-balance" style={{ color: "#8b7355" }}>
              Recherche Avancee
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-xl mx-auto text-pretty">
              Explorez notre collection par image ou par description
            </p>
          </div>

          {/* Grid - Image a gauche, Chatbot a droite */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          
            {/* === RECHERCHE PAR IMAGE (GAUCHE) === */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden order-1">
              {/* Header */}
              <div className="px-5 py-4 md:px-6 md:py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(139, 115, 85, 0.1)" }}>
                    <Camera className="w-5 h-5" style={{ color: "#8b7355" }} />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900">
                      Recherche par Image
                    </h2>
                    <p className="text-sm text-slate-500">Televersez ou photographiez</p>
                  </div>
                </div>
              </div>
            
              <div className="p-5 md:p-6">
                {/* Banniere premium */}
                {(!user || userData?.role === "free") && (
                  <div className="mb-5 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">Premium</span> - Recherches illimitees
                      <Link href="/pricing" className="ml-2 underline font-medium hover:no-underline">
                        En savoir plus
                      </Link>
                    </p>
                  </div>
                )}

                {/* Image analysee */}
                {capturedImage && !isSearching && searchResults.length > 0 && (
                  <div className="mb-5">
                    <p className="text-sm font-medium text-slate-600 mb-3 text-center">Image analysee</p>
                    <div className="aspect-square relative bg-slate-50 rounded-xl overflow-hidden max-w-44 mx-auto border border-slate-100">
                      <Image src={capturedImage || "/placeholder.svg"} alt="Image analysee" fill className="object-contain" />
                    </div>
                  </div>
                )}

                {/* Video et canvas caches */}
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

                {/* Selection methode */}
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
          </div>

          {/* === RESULTATS RECHERCHE IMAGE (ordre 2 sur mobile, pleine largeur sur desktop) === */}
          {searchResults.length > 0 && (
            <div className="order-2 lg:order-3 lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg border border-slate-100">
              {/* Header des resultats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 md:mb-6 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(139, 115, 85, 0.1)" }}>
                    <Search className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#8b7355" }} />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-slate-900">
                    {searchResults.length} luminaires trouves
                  </h3>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <Button
                    onClick={searchAgain}
                    className="flex-1 sm:flex-none text-white rounded-lg text-xs sm:text-sm h-9 sm:h-10"
                    style={{ backgroundColor: "#8b7355" }}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Relancer"
                    )}
                  </Button>
                  <Button
                    onClick={resetSearch}
                    variant="outline"
                    className="flex-1 sm:flex-none rounded-lg text-xs sm:text-sm h-9 sm:h-10 border-slate-200"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Nouveau
                  </Button>
                </div>
              </div>

              {/* Grille des resultats - responsive */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                {searchResults.map((result: any, index) => {
                  const cardContent = (
                    <>
                      <div className="relative w-full aspect-square mb-2 sm:mb-3 overflow-hidden rounded-lg bg-slate-50">
                        <Image
                          src={result.imageUrl || "/placeholder.svg"}
                          alt={result.imageId || `Resultat ${index + 1}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg"
                          }}
                        />
                        {/* Badge similarite */}
                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium text-white" style={{ backgroundColor: "#8b7355" }}>
                          {Math.round(result.similarity * 100)}%
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-900 line-clamp-2 leading-tight">
                        {result.localMatch?.nom || result.imageId || `Luminaire ${index + 1}`}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                        {result.hasLocalMatch ? "Voir la fiche" : "Image similaire"}
                      </p>
                    </>
                  )

                  return result.hasLocalMatch && result.luminaireUrl ? (
                    <Link 
                      key={index} 
                      href={result.luminaireUrl}
                      className="group bg-white rounded-xl p-2 sm:p-3 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-200"
                    >
                      {cardContent}
                    </Link>
                  ) : (
                    <div 
                      key={index}
                      className="bg-white rounded-xl p-2 sm:p-3 border border-slate-100"
                    >
                      {cardContent}
                    </div>
                  )
                })}
              </div>

              <p className="mt-4 md:mt-5 text-center text-xs sm:text-sm text-slate-500">
                Cliquez sur un luminaire pour voir sa fiche detaillee
              </p>
            </div>
          )}

          {/* === CHATBOT (DROITE) === */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex flex-col h-[480px] md:h-[560px] order-3 lg:order-2">
            {/* Header */}
            <div className="px-5 py-4 md:px-6 md:py-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(139, 115, 85, 0.1)" }}>
                    <Send className="w-5 h-5" style={{ color: "#8b7355" }} />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900">
                      Recherche par Description
                    </h2>
                    <p className="text-sm text-slate-500">Decrivez ce que vous cherchez</p>
                  </div>
                </div>
                {chatMessages.length > 0 && (
                  <button 
                    onClick={resetChat} 
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {/* Zone messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3">
              {chatMessages.length === 0 && !isChatSearching && (
                <div className="text-center py-10">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(139, 115, 85, 0.08)" }}>
                    <Search className="w-6 h-6" style={{ color: "#8b7355" }} />
                  </div>
                  <h3 className="text-base font-medium text-slate-800 mb-2">Comment puis-je vous aider ?</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    Decrivez le luminaire recherche, par exemple : "lustre art deco bronze"
                  </p>
                </div>
              )}

              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user" 
                        ? "bg-slate-900 text-white" 
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    
                    {message.results && message.results.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {message.results.slice(0, 3).map((result: any, index: number) => (
                          result.luminaireId ? (
                            <Link key={index} href={`/luminaires/${result.luminaireId}`} className="block">
                              <div className="flex gap-3 p-2 bg-white rounded-xl hover:bg-slate-50 transition-colors border border-slate-200">
                                <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                                  <Image
                                    src={result.imageUrl || "/placeholder.svg"}
                                    alt={result.nom || "Luminaire"}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 text-sm truncate">{result.nom || "Luminaire"}</p>
                                  <p className="text-xs text-slate-500">{result.artiste}</p>
                                  {result.similarity && (
                                    <p className="text-xs font-medium mt-0.5" style={{ color: "#8b7355" }}>
                                      {Math.round(result.similarity * 100)}% similaire
                                    </p>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ) : null
                        ))}
                      </div>
                    )}
                    
                    <p className="text-[10px] opacity-60 mt-2">
                      {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {isChatSearching && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#8b7355" }} />
                      <span className="text-sm text-slate-600">Recherche...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatMessagesEndRef} />
            </div>

            {/* Zone saisie */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-3 md:p-4">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleChatSearch()
                    }
                  }}
                  placeholder="Decrivez le luminaire..."
                  className="flex-1 h-11 rounded-xl text-sm bg-white border-slate-200 focus:border-[#8b7355] focus:ring-[#8b7355]/20"
                  disabled={isChatSearching}
                />
                <Button
                  onClick={handleChatSearch}
                  disabled={!chatInput.trim() || isChatSearching}
                  className="h-11 w-11 rounded-xl text-white p-0"
                  style={{ backgroundColor: chatInput.trim() && !isChatSearching ? "#8b7355" : "#ccc" }}
                >
                  {isChatSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              {!user && (
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  Connectez-vous pour utiliser la recherche
                </p>
              )}
            </div>
          </div>
        </div>{/* End grid */}
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
