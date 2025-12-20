"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Upload, Send, ImageIcon, Loader2, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"

const API_ORCHESTRATOR = "https://gersaint-multimodal-844978726064.europe-west1.run.app/api/multimodal_search"

interface SearchResult {
  imageId?: string
  imageUrl?: string
  luminaireUrl?: string | null
  luminaireId?: string | null
  nom?: string
  artiste?: string
  designer?: string
  annee?: string
  similarity?: number
  lien_site?: string
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
  const [inputValue, setInputValue] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showHistory, setShowHistory] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      }
    }
  }, [user])

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

    if (currentConversation) {
      updatedConversation = {
        ...currentConversation,
        messages: [...currentConversation.messages, message],
        searchContext: newSearchContext !== undefined ? newSearchContext : currentConversation.searchContext,
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

  const IMAGE_SERVER_PREFIX = "https://image-similarity-api-590690354412.us-central1.run.app"

  const enrichOrchestratorResults = async (results: any[]): Promise<SearchResult[]> => {
    console.log("[v0] enrichOrchestratorResults called with:", results)

    const enriched = await Promise.all(
      results.slice(0, 5).map(async (result, index) => {
        console.log(`[v0] Processing result ${index}:`, result)

        let imageUrl = "/placeholder.svg"
        let fileName = ""

        if (result.image_url) {
          imageUrl = result.image_url.startsWith("/") ? `${IMAGE_SERVER_PREFIX}${result.image_url}` : result.image_url
          fileName = result.image_url.split("/").pop()?.toLowerCase() || ""
        } else if (result.image_id) {
          fileName = String(result.image_id).toLowerCase()
          imageUrl = `${IMAGE_SERVER_PREFIX}/images/${fileName}`
        } else if (result.image || result.filename) {
          fileName = (result.image || result.filename).toLowerCase()
          imageUrl = `${IMAGE_SERVER_PREFIX}/images/${fileName}`
        }

        let luminaireId = null
        let enrichedMetadata = null

        if (fileName) {
          try {
            const apiUrl = `/api/luminaire-by-image?filename=${encodeURIComponent(fileName)}`
            const response = await fetch(apiUrl)

            if (response.ok) {
              const data = await response.json()
              console.log(`[v0] API response for ${fileName}:`, data)
              if (data.success && data.found) {
                luminaireId = data.luminaireId
                enrichedMetadata = data.metadata
              }
            }
          } catch (error) {
            console.error("[v0] Error fetching luminaire ID:", error)
          }
        }

        const apiMeta = enrichedMetadata || {}
        const resultMeta = result.metadata || {}

        console.log(`[v0] Result ${index} metadata sources:`, {
          apiMeta,
          resultMeta,
          resultDirect: { nom: result.nom, artiste: result.artiste, annee: result.annee },
        })

        const nom =
          apiMeta.nom ||
          apiMeta.name ||
          apiMeta.title ||
          apiMeta.modele ||
          resultMeta.nom ||
          resultMeta.name ||
          resultMeta.title ||
          resultMeta.modele ||
          result.nom ||
          result.name ||
          result.title ||
          result.modele ||
          (fileName ? fileName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "").replace(/[_-]/g, " ") : "Sans nom")

        const artiste =
          apiMeta.artiste ||
          apiMeta.artist ||
          apiMeta.designer ||
          apiMeta.createur ||
          resultMeta.artiste ||
          resultMeta.artist ||
          resultMeta.designer ||
          resultMeta.createur ||
          result.artiste ||
          result.artist ||
          result.designer ||
          result.createur ||
          "Inconnu"

        const annee =
          apiMeta.annee ||
          apiMeta.year ||
          apiMeta.date ||
          apiMeta.periode ||
          resultMeta.annee ||
          resultMeta.year ||
          resultMeta.date ||
          resultMeta.periode ||
          result.annee ||
          result.year ||
          result.date ||
          result.periode ||
          ""

        const enrichedResult = {
          imageUrl,
          luminaireUrl: luminaireId ? `/luminaires/${luminaireId}` : null,
          luminaireId,
          nom,
          artiste,
          annee,
        }

        console.log(`[v0] Result ${index} enriched:`, enrichedResult)

        return enrichedResult
      }),
    )

    const filtered = enriched.filter((r) => r.luminaireId !== null)
    console.log("[v0] Filtered results:", filtered)

    return filtered
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)
    }
  }

  const handleSearch = async () => {
    if (!inputValue.trim() && !selectedImage) {
      toast.error("Veuillez entrer une description ou téléverser une image")
      return
    }

    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche")
      return
    }

    if (userData?.role !== "premium" && userData?.role !== "admin") {
      toast.error("Cette fonctionnalité est réservée aux membres Premium")
      return
    }

    const messages = currentConversation?.messages || []
    const conversationContext = messages
      .filter((m) => m.role === "user" && m.content.trim() !== "" && !m.content.startsWith("Je n'ai trouvé"))
      .map((m) => m.content)
      .join(", ")

    const newSearchContext =
      conversationContext + (inputValue.trim() ? (conversationContext ? ", " : "") + inputValue.trim() : "")

    const displayText = inputValue.trim() || (selectedImage ? "Recherche par image" : "")

    let userImageUrl: string | undefined = undefined
    if (selectedImage) {
      userImageUrl = URL.createObjectURL(selectedImage)
    }

    addMessage("user", displayText, userImageUrl)

    const currentImage = selectedImage
    const currentInput = inputValue

    setInputValue("")
    setSelectedImage(null)
    setImagePreview(null)
    setIsSearching(true)

    try {
      const formData = new FormData()

      formData.append("query", newSearchContext || "")

      if (currentImage) {
        formData.append("image", currentImage)
      }

      formData.append("top_k", "5")

      const response = await fetch(API_ORCHESTRATOR, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Erreur lors de la recherche")

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const enrichedResults = await enrichOrchestratorResults(data.results)

        addMessage(
          "assistant",
          `J'ai trouvé ${enrichedResults.length} luminaire(s) correspondant à votre recherche :`,
          undefined,
          enrichedResults,
          newSearchContext,
        )

        if (user) {
          incrementSearchCount()
        }
      } else {
        addMessage("assistant", "Je n'ai trouvé aucun luminaire correspondant à votre recherche.", undefined, [])
      }
    } catch (error) {
      console.error("[v0] Erreur de recherche:", error)
      toast.error("Erreur lors de la recherche")
      addMessage(
        "assistant",
        "Désolé, une erreur s'est produite lors de la recherche. Veuillez réessayer.",
        undefined,
        [],
      )
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      {user && userData && userData.role !== "premium" && userData.role !== "admin" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <Card className="max-w-md mx-4 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <ImageIcon className="w-8 h-8" style={{ color: "#f2d895" }} />
            </div>
            <h2 className="text-2xl font-serif text-slate-800 mb-3">Fonctionnalité Premium</h2>
            <p className="text-slate-600 mb-6">
              La recherche avancée est réservée aux membres Premium. Passez à Premium pour accéder à toutes les
              fonctionnalités.
            </p>
            <Link href="/pricing">
              <Button className="w-full text-white" style={{ backgroundColor: "#f2d895" }}>
                Voir les tarifs
              </Button>
            </Link>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
        <div
          className={`${
            showHistory ? "h-48 md:h-auto md:w-80" : "h-0 md:w-0"
          } transition-all duration-300 bg-white border-b md:border-b-0 md:border-r border-slate-200 overflow-hidden flex flex-col`}
        >
          <div className="p-2 md:p-4 border-b border-slate-200">
            <Button
              onClick={createNewConversation}
              className="w-full text-sm md:text-base"
              style={{ backgroundColor: "#f2d895" }}
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
          <div className="p-3 md:p-6 bg-white border-b border-slate-200">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-xl md:text-3xl font-serif text-slate-800 mb-1 md:mb-2" style={{ color: "#f2d895" }}>
                Recherche de Luminaires
              </h1>
              <p className="text-xs md:text-base text-slate-600">
                {currentConversation
                  ? "Continuez votre recherche ou affinez les résultats"
                  : "Commencez une nouvelle recherche par texte ou par image"}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-3 md:p-6">
              {!currentConversation && !isSearching && (
                <div className="text-center mt-10 md:mt-20">
                  <div className="w-14 h-14 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 md:w-10 md:h-10" style={{ color: "#f2d895" }} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-serif text-slate-800 mb-2 md:mb-3">
                    Comment puis-je vous aider ?
                  </h2>
                  <p className="text-sm md:text-base text-slate-600 mb-4 md:mb-8 px-4">
                    Décrivez le luminaire que vous recherchez ou téléversez une image
                  </p>
                </div>
              )}

              {currentConversation && (
                <div className="space-y-4 md:space-y-6">
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[80%] ${message.role === "user" ? "bg-amber-100" : "bg-white border border-slate-200"} rounded-2xl p-3 md:p-4`}
                      >
                        {message.role === "user" && (
                          <>
                            <p className="text-sm md:text-base text-slate-800 mb-2">{message.content}</p>
                            {message.imageUrl && (
                              <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden mt-2">
                                <Image
                                  src={message.imageUrl || "/placeholder.svg"}
                                  alt="Uploaded image"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <p className="text-[10px] md:text-xs text-slate-500 mt-2">
                              {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </>
                        )}

                        {message.role === "assistant" && (
                          <>
                            <p className="text-sm md:text-base text-slate-800 mb-3 md:mb-4">{message.content}</p>

                            {message.results && message.results.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
                                {message.results.slice(0, 5).map((result, index) => {
                                  if (!result.luminaireId) return null

                                  return (
                                    <Link
                                      key={index}
                                      href={result.luminaireUrl || "#"}
                                      className="group block rounded-lg overflow-hidden border border-slate-200 hover:border-amber-300 transition-all hover:shadow-lg"
                                    >
                                      <div className="relative w-full aspect-square bg-slate-100">
                                        <Image
                                          src={result.imageUrl || "/placeholder.svg"}
                                          alt={result.nom || "Luminaire"}
                                          fill
                                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                                          unoptimized
                                        />
                                      </div>
                                      <div className="p-2 md:p-3 bg-white">
                                        <p className="text-xs md:text-sm font-medium text-slate-800 line-clamp-1">
                                          {result.nom}
                                        </p>
                                        <p className="text-[10px] md:text-xs text-slate-600 line-clamp-1">
                                          {result.artiste}
                                        </p>
                                        {result.annee && (
                                          <p className="text-[10px] md:text-xs text-slate-500">{result.annee}</p>
                                        )}
                                      </div>
                                    </Link>
                                  )
                                })}
                              </div>
                            )}

                            <p className="text-[10px] md:text-xs text-slate-500 mt-3">
                              {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {isSearching && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" style={{ color: "#f2d895" }} />
                          <span className="text-sm md:text-base text-slate-600">Recherche en cours...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          <div className="p-3 md:p-4 bg-white border-t border-slate-200">
            <div className="max-w-4xl mx-auto">
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 border-amber-200">
                    <Image src={imagePreview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                  </div>
                  <button
                    onClick={() => {
                      setSelectedImage(null)
                      setImagePreview(null)
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-10 w-10 md:h-12 md:w-12"
                  disabled={isSearching}
                >
                  <Upload className="w-4 h-4 md:w-5 md:h-5" />
                </Button>

                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSearch()
                    }
                  }}
                  placeholder="Décrivez le luminaire ou affinez votre recherche..."
                  className="flex-1 h-10 md:h-12 text-sm md:text-base"
                  disabled={isSearching}
                />

                <Button
                  onClick={handleSearch}
                  size="icon"
                  style={{ backgroundColor: "#f2d895" }}
                  className="shrink-0 h-10 w-10 md:h-12 md:w-12"
                  disabled={isSearching || (!inputValue.trim() && !selectedImage)}
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
