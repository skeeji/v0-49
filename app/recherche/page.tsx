"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Upload, Send, ImageIcon, Loader2, Trash2, Plus, ShoppingBag, Check, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { useSelection } from "@/contexts/SelectionContext"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { MobileFooter } from "@/components/MobileFooter"
import { MarkdownMessage } from "@/components/MarkdownMessage"

const API_BASE_URL_IMAGE = "https://image-similarity-api-590690354412.us-central1.run.app"

interface SearchResult {
  imageId?: string
  imageUrl?: string
  luminaireUrl?: string | null
  luminaireId?: string | null
  nom?: string
  artiste?: string
  designer?: string
  annee?: string | number
  similarity?: number
  lien_site?: string
  dimensions?: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  imageUrl?: string
  results?: SearchResult[]
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  searchContext: string
  createdAt: Date
  updatedAt: Date
}

export default function RecherchePage() {
  const { user, userData, incrementSearchCount } = useAuth()
  const { addToSelection, isInSelection, selection, setIsSelectionOpen } = useSelection()
  const [inputValue, setInputValue] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchStep, setSearchStep] = useState<string | null>(null)

  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentConversationRef = useRef<Conversation | null>(null)

  useEffect(() => {
    if (window.innerWidth >= 768) setShowHistory(true)
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    if (userData && userData.role !== "premium" && userData.role !== "admin") {
      // Users will stay on the page with the overlay message and button
    }
  }, [user, userData])

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`conversations_${user.uid}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        const hydrated = parsed.map((conv: any) => ({
          ...conv,
          searchContext: conv.searchContext || "",
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }))
        setConversations(hydrated)
        const lastActive = [...hydrated].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0]
        if (lastActive) setCurrentConversation(lastActive)
      }
    }
  }, [user])

  useEffect(() => {
    currentConversationRef.current = currentConversation
  }, [currentConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation?.messages])

  const saveConversations = (convs: Conversation[]) => {
    if (!user) return
    localStorage.setItem(`conversations_${user.uid}`, JSON.stringify(convs))
  }

  const createNewConversation = () => {
    setCurrentConversation(null)
    setInputValue("")
    setSelectedImage(null)
    setImagePreview(null)
  }

  const loadConversation = (conv: Conversation) => {
    setCurrentConversation(conv)
    setInputValue("")
    setSelectedImage(null)
    setImagePreview(null)
  }

  const deleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id)
    setConversations(updated)
    saveConversations(updated)
    if (currentConversation?.id === id) {
      setCurrentConversation(null)
    }
  }

  const addMessage = (
    role: "user" | "assistant",
    content: string,
    imageUrl?: string,
    results?: SearchResult[],
    newSearchContext?: string,
  ) => {
    const message: Message = {
      id: Date.now().toString(),
      role,
      content,
      imageUrl,
      results,
      timestamp: new Date(),
    }

    let updatedConversation: Conversation

    const activeConv = currentConversationRef.current
    if (activeConv) {
      updatedConversation = {
        ...activeConv,
        messages: [...activeConv.messages, message],
        searchContext: newSearchContext !== undefined ? newSearchContext : activeConv.searchContext,
        updatedAt: new Date(),
      }
    } else {
      updatedConversation = {
        id: Date.now().toString(),
        title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
        messages: [message],
        searchContext: newSearchContext || content,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    setCurrentConversation(updatedConversation)
    currentConversationRef.current = updatedConversation

    const convIndex = conversations.findIndex((c) => c.id === updatedConversation.id)
    let updatedConversations: Conversation[]

    if (convIndex >= 0) {
      updatedConversations = [...conversations]
      updatedConversations[convIndex] = updatedConversation
    } else {
      updatedConversations = [updatedConversation, ...conversations]
    }

    setConversations(updatedConversations)
    saveConversations(updatedConversations)

    return updatedConversation
  }

  // Construit le contexte de recherche depuis les inputs utilisateur uniquement (jamais les messages assistant)
  const buildUserContext = (extraInput?: string): string => {
    const previousInputs = (currentConversationRef.current?.messages || [])
      .filter((m) => m.role === "user" && m.content !== "Recherche par image")
      .map((m) => m.content)
    if (extraInput) previousInputs.push(extraInput)
    return previousInputs.join(", ")
  }

  const handleSearch = async () => {
    const hasText = inputValue.trim() !== ""
    const hasImage = selectedImage !== null

    if (!hasText && !hasImage) return

    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche")
      return
    }

    if (userData?.role !== "premium" && userData?.role !== "admin") {
      toast.error("Cette fonctionnalité est réservée aux membres Premium")
      return
    }

    const userContent = hasText ? inputValue : "Recherche par image"
    const previewUrl = hasImage ? URL.createObjectURL(selectedImage!) : undefined
    const cleanContext = buildUserContext(hasText ? inputValue : undefined)
    const imageToSearch = selectedImage

    // Comptabilise l'usage pour les utilisateurs free (protection secondaire si l'overlay est bypassé)
    if (userData?.role === "free") {
      const canProceed = await incrementSearchCount()
      if (!canProceed) return
    }

    addMessage("user", userContent, previewUrl)
    setInputValue("")
    setSelectedImage(null)
    setImagePreview(null)
    setIsSearching(true)

    console.log(`[SEARCH] ▶ Début — texte="${hasText ? inputValue : "—"}" | image=${hasImage} | contexte="${cleanContext}"`)

    try {
      setSearchStep("Analyse de votre demande…")

      // Étape 1 : Groq route — décide si réponse directe ou recherche (+ extrait query/top_k si search)
      const convForRoute = (currentConversationRef.current?.messages || []).slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
        results: m.results?.slice(0, 4).map((r) => ({ nom: r.nom, artiste: r.artiste })),
      }))

      console.log(`[GROQ:route] ▶ Appel — message="${userContent}" | conv=${convForRoute.length} msgs | image=${hasImage}`)

      let routeAction: "search" | "answer" = "search"
      let directMessage: string | null = null
      let searchQuery = cleanContext || userContent
      let topK = 3

      try {
        const routeRes = await fetch("/api/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "route",
            conversation: convForRoute,
            currentMessage: hasText ? inputValue : "",
            hasImage,
          }),
        })
        if (routeRes.ok) {
          const routeData = await routeRes.json()
          routeAction = routeData.action === "answer" ? "answer" : "search"
          if (routeAction === "answer") {
            directMessage = routeData.message || null
            console.log(`[GROQ:route] 💬 Réponse directe`)
          } else {
            if (routeData.query !== undefined) searchQuery = routeData.query
            if (routeData.top_k) topK = routeData.top_k
            console.log(`[GROQ:route] 🔍 Recherche — query="${searchQuery}" | top_k=${topK}`)
          }
        } else {
          console.warn(`[GROQ:route] ❌ Erreur HTTP ${routeRes.status}`)
        }
      } catch (e) {
        console.warn("[GROQ:route] ❌ Exception:", e)
      }

      // ── Chemin A : réponse conversationnelle directe (pas de recherche) ──
      if (routeAction === "answer") {
        setSearchStep(null)
        addMessage(
          "assistant",
          directMessage || "Je suis là pour vous aider à trouver le luminaire idéal.",
          undefined,
          undefined,
          cleanContext,
        )
        return
      }

      // ── Chemin B : recherche multimodale ──
      setSearchStep("Recherche dans la collection…")
      console.log(`[FUSION] ▶ Appel orchestrateur — query="${searchQuery}" | top_k=${topK} | image=${!!imageToSearch}`)

      const formData = new FormData()
      formData.append("query", searchQuery)
      formData.append("top_k", String(topK))
      if (imageToSearch) formData.append("image", imageToSearch)

      const response = await fetch("/api/multimodal-search", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        console.error(`[FUSION] ❌ Erreur HTTP ${response.status}`)
        throw new Error("Erreur orchestrateur")
      }

      const data = await response.json()
      console.log(`[FUSION] ✅ Résultats bruts: ${data.results?.length ?? 0}`)

      if (data.results && data.results.length > 0) {
        setSearchStep("Chargement des fiches…")
        console.log(`[ENRICH] ▶ Enrichissement MongoDB de ${data.results.length} résultats...`)
        const enrichedResults = await enrichResultsWithIds(data.results)
        const visible = enrichedResults.filter((r) => r.luminaireId)
        console.log(`[ENRICH] ✅ ${enrichedResults.length} enrichis | ${visible.length} avec ID MongoDB | ${enrichedResults.length - visible.length} sans match`)

        let groqMessage: string | null = null
        try {
          setSearchStep("Rédaction de la réponse…")
          console.log(`[GROQ:describe] ▶ Appel — ${visible.length} résultats à présenter`)
          const groqRes = await fetch("/api/groq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "describe",
              query: userContent,
              searchContext: cleanContext,
              hasImage,
              results: visible.slice(0, 6).map((r) => ({
                nom: r.nom,
                artiste: r.artiste,
                annee: r.annee,
                dimensions: r.dimensions,
              })),
            }),
          })
          if (groqRes.ok) {
            const groqData = await groqRes.json()
            groqMessage = groqData.message || null
            console.log(`[GROQ:describe] ✅ Message: "${groqMessage}"`)
          } else {
            console.warn(`[GROQ:describe] ❌ Erreur HTTP ${groqRes.status}`)
          }
        } catch (e) {
          console.warn("[GROQ:describe] ❌ Exception:", e)
        }

        addMessage(
          "assistant",
          groqMessage || `J'ai trouvé ${visible.length} luminaire(s) :`,
          undefined,
          enrichedResults,
          cleanContext,
        )
        toast.success(`${visible.length} luminaire(s) trouvé(s)`)
      } else {
        console.log("[FUSION] ⚠ Aucun résultat retourné")
        addMessage(
          "assistant",
          "Je n'ai trouvé aucun luminaire correspondant. Essayez une autre description ou image.",
          undefined,
          undefined,
          cleanContext,
        )
        toast.info("Aucun résultat trouvé")
      }
    } catch (error) {
      console.error("[SEARCH] ❌ Erreur globale:", error)
      addMessage("assistant", "Désolé, une erreur s'est produite lors de la recherche. Veuillez réessayer.")
      toast.error("Erreur lors de la recherche")
    } finally {
      setIsSearching(false)
      setSearchStep(null)
      console.log("[SEARCH] ■ Fin de la recherche")
    }
  }

  const enrichResultsWithIds = async (results: any[]): Promise<SearchResult[]> => {
    // Extract a filename for each result
    const fileNames = results.map((result) => {
      const raw = result.luminaireId || result.luminaire_id
      let name = raw?.split("/").pop()?.toLowerCase() || raw?.toLowerCase() || ""
      if (!name && result.imageUrl) name = result.imageUrl.split("/").pop()?.toLowerCase() || ""
      if (!name && result.image_url) name = result.image_url.split("/").pop()?.toLowerCase() || ""
      return name
    })

    // Single batch request instead of N individual calls
    const batchMap: Record<string, any> = {}
    const validNames = fileNames.filter(Boolean)
    if (validNames.length > 0) {
      try {
        const res = await fetch("/api/luminaires/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filenames: validNames }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success) Object.assign(batchMap, data.result)
        }
      } catch (error) {
        console.error("[enrich] Erreur batch:", error)
      }
    }

    return results.map((result, i) => {
      const fileName = fileNames[i]
      const match = fileName ? batchMap[fileName] : null

      return {
        imageUrl: fileName ? `/api/images/filename/${fileName}` : (result.imageUrl || result.image_url || "/placeholder.svg"),
        luminaireUrl: match ? `/luminaires/${match.luminaireId}` : null,
        luminaireId: match?.luminaireId || null,
        nom: match?.nom || result.nom || "Sans nom",
        artiste: match?.artiste || result.artiste || "Inconnu",
        annee: (() => {
          const v = match?.annee || result.annee
          return v === null || v === "" || v === undefined ? "Non spécifié" : String(v)
        })(),
        similarity: result.similarity || 0,
        dimensions: match?.dimensions || result.dimensions || "",
        materiaux: match?.materiaux || result.materiaux || "",
        puissance: match?.puissance || result.puissance || "",
        prixHT: match?.prixHT || result.prixHT || "",
      }
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)
      // Ne lance pas la recherche automatiquement : l'utilisateur peut ajouter du texte avant d'envoyer
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8] pb-20">
      {user && userData && userData.role !== "premium" && userData.role !== "admin" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <Card className="max-w-md mx-4 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <ImageIcon className="w-8 h-8" style={{ color: "#8b7355" }} />
            </div>
            <h2 className="text-2xl font-serif text-slate-800 mb-3">Fonctionnalité Premium</h2>
            <p className="text-slate-600 mb-6">
              La recherche avancée est réservée aux membres Premium. Passez à Premium pour accéder à toutes les
              fonctionnalités.
            </p>
            <Link href="/pricing">
              <Button className="w-full text-white" style={{ backgroundColor: "#8b7355" }}>
                Voir les tarifs
              </Button>
            </Link>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
        <div
          className={`${
            showHistory ? "h-48 md:h-auto md:w-64" : "h-0 md:w-0"
          } transition-all duration-300 bg-white border-b md:border-b-0 md:border-r border-slate-200 overflow-hidden flex flex-col`}
        >
          <div className="p-2 md:p-4 border-b border-slate-200">
            <Button
              onClick={createNewConversation}
              className="w-full text-sm md:text-base text-white"
              style={{ backgroundColor: "#8b7355" }}
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Nouvelle conversation
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-1 md:p-2">
            {!user ? (
              <div className="text-center text-slate-500 text-xs md:text-sm mt-4 md:mt-8 px-2 md:px-4">
                Connectez-vous pour sauvegarder vos conversations
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-slate-500 text-xs md:text-sm mt-4 md:mt-8 px-2 md:px-4">
                Aucune conversation
              </div>
            ) : (
              <div className="space-y-1 md:space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-2 md:p-3 rounded-lg cursor-pointer group transition-colors relative ${
                      currentConversation?.id === conv.id
                        ? "bg-amber-50 border-2 border-amber-200"
                        : "hover:bg-slate-100"
                    }`}
                    onClick={() => loadConversation(conv)}
                  >
                    <div className="flex items-start gap-1 md:gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-slate-800 truncate font-medium">{conv.title}</p>
                        <p className="text-[10px] md:text-xs text-slate-500">
                          {conv.messages.length} message(s) •{" "}
                          {conv.updatedAt.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conv.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 md:p-4 bg-white border-b border-slate-200">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Afficher/masquer l'historique"
                >
                  <Menu className="w-5 h-5 text-slate-500" />
                </button>
                <div>
                  <h1 className="text-lg md:text-2xl font-serif" style={{ color: "#8b7355" }}>
                    Recherche de Luminaires
                  </h1>
                  <p className="text-xs text-slate-500 hidden md:block">
                    {currentConversation
                      ? "Continuez votre recherche ou affinez les résultats"
                      : "Commencez une nouvelle recherche par texte ou par image"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSelectionOpen(true)}
                className="relative flex items-center gap-2 px-3 py-2 bg-[#faf8f5] hover:bg-[#f5f1e8] border border-stone-200 rounded-lg transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-[#8b7355]" />
                <span className="hidden sm:inline text-sm font-medium text-stone-700">Ma Sélection</span>
                {selection.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#8b7355] text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {selection.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-3 md:p-6">
              {!currentConversation && !isSearching && (
                <div className="text-center mt-10 md:mt-20">
                  <div className="w-14 h-14 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 md:w-10 md:h-10" style={{ color: "#8b7355" }} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-serif text-slate-800 mb-2 md:mb-3">
                    Comment puis-je vous aider ?
                  </h2>
                  <p className="text-sm md:text-base text-slate-600 mb-6 px-4">
                    Décrivez le luminaire que vous recherchez ou téléversez une image
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 px-4">
                    {["Lustre Art Déco doré", "Applique moderniste 1950s", "Suspension en verre de Murano", "Lampadaire design scandinave"].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInputValue(suggestion)}
                        className="px-3 py-1.5 text-sm border border-stone-300 rounded-full hover:bg-[#8b7355] hover:text-white hover:border-[#8b7355] transition-colors text-stone-600 bg-white"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentConversation && (
                <div className="space-y-4 md:space-y-6">
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex flex-col max-w-[75%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                      <div
                        className={`${message.role === "user" ? "bg-[#8b7355] text-white" : "bg-white shadow-sm"} rounded-2xl p-3 md:p-4 w-full`}
                      >
                        {message.role === "user" && (
                          <div className="space-y-2">
                            {message.content && message.content !== "Recherche par image" && (
                              <p className="text-sm md:text-base">{message.content}</p>
                            )}
                            {message.imageUrl && (
                              <div className="space-y-1">
                                <p className="text-xs text-white/70">Image :</p>
                                <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden">
                                  <Image
                                    src={message.imageUrl}
                                    alt="Uploaded"
                                    fill
                                    className="object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {message.role === "assistant" && (
                          <>
                            <MarkdownMessage content={message.content} className="text-sm md:text-base mb-3 md:mb-4" />

                            {message.results && message.results.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
                                {message.results.map((result, index) => {
                                  if (!result.luminaireId) return null
                                  
                                  // Extract imageId from imageUrl if not provided (e.g., "luminaire_4428.jpg" from URL)
                                  let extractedImageId = result.imageId || ""
                                  if (!extractedImageId && result.imageUrl) {
                                    const urlParts = result.imageUrl.split("/")
                                    const filename = urlParts[urlParts.length - 1]
                                    if (filename) {
                                      extractedImageId = filename // e.g., "luminaire_4428.jpg"
                                    }
                                  }
                                  const itemId = result.luminaireId || extractedImageId || `result-${index}`
                                  const isSelected = isInSelection(itemId)

                                  return (
                                    <div key={index} className="relative group">
                                      {/* Add to selection button */}
                                      <button
                                        onClick={async (e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          if (!isSelected) {
                                            let fullData = {
                                              dimensions: result.dimensions || "",
                                              materiaux: result.materiaux || "",
                                              puissance: result.puissance || "",
                                              prixHT: result.prixHT || "",
                                              annee: result.annee ? String(result.annee) : "",
                                            }
                                            let nomComplet = ""
                                            let artisteComplet = ""
                                            if (result.luminaireId) {
                                              try {
                                                const res = await fetch(`/api/luminaires/${result.luminaireId}`)
                                                if (res.ok) {
                                                  const d = await res.json()
                                                  if (d.data) {
                                                    nomComplet = d.data.nom || d.data["Nom luminaire"] || ""
                                                    artisteComplet = d.data["Artiste / Dates"] || d.data.designer || ""
                                                    fullData.dimensions = d.data.dimensions || d.data["Dimensions"] || fullData.dimensions
                                                    fullData.materiaux = Array.isArray(d.data.materiaux) ? d.data.materiaux.join(", ") : d.data.materiaux || d.data["Matériaux"] || fullData.materiaux
                                                    fullData.puissance = d.data.puissance || d.data["Puissance"] || fullData.puissance
                                                    fullData.prixHT = d.data.estimation || d.data["Estimation"] || d.data.prixHT || fullData.prixHT
                                                    fullData.annee = d.data.annee || d.data["Année"] || fullData.annee
                                                  }
                                                }
                                              } catch {}
                                            }
                                            addToSelection({
                                              id: itemId,
                                              imageId: extractedImageId,
                                              imageUrl: result.imageUrl || "/placeholder.svg",
                                              nom: nomComplet || result.nom || extractedImageId || "Luminaire",
                                              artiste: artisteComplet || result.artiste || "Inconnu",
                                              ...fullData,
                                            })
                                            toast.success("Ajouté à la sélection")
                                          }
                                        }}
                                        className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
                                          isSelected
                                            ? "bg-green-500 text-white cursor-default"
                                            : "bg-white/90 hover:bg-[#8b7355] hover:text-white text-stone-600"
                                        }`}
                                        title={isSelected ? "Déjà ajouté" : "Ajouter à la sélection"}
                                        disabled={isSelected}
                                      >
                                        {isSelected ? (
                                          <Check className="w-4 h-4" />
                                        ) : (
                                          <Plus className="w-4 h-4" />
                                        )}
                                      </button>
                                      <Link
                                        href={`/luminaires/${result.luminaireId}`}
                                        className="block"
                                      >
                                        <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                                          <div className="relative w-full h-40 bg-slate-100">
                                            <Image
                                              src={result.imageUrl || "/placeholder.svg"}
                                              alt={result.nom || result.imageId || "Luminaire"}
                                              fill
                                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                                              unoptimized
                                            />
                                          </div>
                                          <div className="p-3 space-y-1">
                                            <h4 className="text-sm font-semibold text-slate-900 line-clamp-2">
                                              {result.nom || result.imageId || "Luminaire"}
                                            </h4>
                                            {result.artiste && (
                                              <p className="text-xs text-slate-600">
                                                {result.artiste}
                                                {result.annee && ` • ${result.annee}`}
                                              </p>
                                            )}
                                            {result.similarity && (
                                              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f5f1e8", color: "#8b7355" }}>
                                                {Math.round(result.similarity * 100)}% similaire
                                              </span>
                                            )}
                                          </div>
                                        </Card>
                                      </Link>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 px-1">
                        {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      </div>
                    </div>
                  ))}

                  {isSearching && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" style={{ color: "#8b7355" }} />
                        <span className="text-sm text-slate-500">{searchStep || "Traitement…"}</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-2 md:p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2 md:gap-3 items-end">
                {imagePreview && (
                  <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={imagePreview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                  </div>
                )}

                <div className="flex-1 relative">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSearch()
                      }
                    }}
                    placeholder="Décrivez le luminaire..."
                    className="pr-10 md:pr-12 h-12 rounded-2xl text-sm md:text-base"
                    disabled={isSearching}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 p-1.5 md:p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    disabled={isSearching}
                  >
                    <Upload className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                  </button>
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={(!inputValue.trim() && !selectedImage) || isSearching}
                  className="h-12 px-4 rounded-xl text-white"
                  style={{ backgroundColor: "#8b7355" }}
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </Button>
              </div>

              {!user && (
                <p className="text-[10px] md:text-xs text-slate-500 mt-2 text-center">
                  Connectez-vous pour utiliser la recherche
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      <MobileFooter />
    </div>
  )
}
