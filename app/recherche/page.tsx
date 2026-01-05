"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Upload, Send, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { MobileFooter } from "@/components/MobileFooter"

const API_BASE_URL_TEXT = "https://chatbot-984654216979.europe-west1.run.app"
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

  const handleTextSearch = async () => {
    if (!inputValue.trim()) return

    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche")
      return
    }

    if (userData?.role !== "premium" && userData?.role !== "admin") {
      toast.error("Cette fonctionnalité est réservée aux membres Premium")
      return
    }

    const previousContext = currentConversation?.searchContext || ""
    const newSearchContext = previousContext ? `${previousContext}, ${inputValue}` : inputValue

    addMessage("user", inputValue)
    setInputValue("")
    setIsSearching(true)

    try {
      console.log("[v0] Sending text search request with query:", newSearchContext)

      const response = await fetch(`${API_BASE_URL_TEXT}/api/search_text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: newSearchContext,
          top_k: 3,
        }),
      })

      if (!response.ok) throw new Error("Erreur lors de la recherche")

      const text = await response.text()
      console.log("[v0] API response text:", text)

      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = JSON.parse(text.replace(/:\s*NaN/g, ": null"))
      }

      console.log("[v0] Parsed data:", data)

      if (data.results && data.results.length > 0) {
        console.log("[v0] Enriching", data.results.length, "results")
        const enrichedResults = await enrichResultsWithIds(data.results)
        console.log("[v0] Enriched results:", enrichedResults)

        addMessage(
          "assistant",
          `J'ai trouvé ${enrichedResults.length} luminaire(s) correspondant à votre recherche :`,
          undefined,
          enrichedResults,
          newSearchContext,
        )

        toast.success(`${enrichedResults.length} luminaire(s) trouvé(s)`)
      } else {
        console.log("[v0] No results found")
        addMessage(
          "assistant",
          "Je n'ai trouvé aucun luminaire correspondant à votre recherche. Essayez une autre description.",
          undefined,
          undefined,
          newSearchContext,
        )
        toast.info("Aucun résultat trouvé")
      }
    } catch (error) {
      console.error("[v0] Search error:", error)
      addMessage("assistant", "Désolé, une erreur s'est produite lors de la recherche. Veuillez réessayer.")
      toast.error("Erreur lors de la recherche")
    } finally {
      setIsSearching(false)
    }
  }

  const handleImageSearch = async (file: File) => {
    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche")
      return
    }

    if (userData?.role !== "premium" && userData?.role !== "admin") {
      toast.error("Cette fonctionnalité est réservée aux membres Premium")
      return
    }

    const imageUrl = URL.createObjectURL(file)

    addMessage("user", "Recherche par image", imageUrl)

    setInputValue("")
    setSelectedImage(null)
    setImagePreview(null)
    setIsSearching(true)

    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("top_k", "3")

      const response = await fetch(`${API_BASE_URL_IMAGE}/api/search`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Erreur lors de la recherche par image")

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const enrichedResults = await enrichImageResultsWithIds(data.results)

        addMessage(
          "assistant",
          `J'ai trouvé ${enrichedResults.length} luminaire(s) similaire(s) :`,
          undefined,
          enrichedResults,
        )

        toast.success(`${enrichedResults.length} luminaire(s) similaire(s) trouvé(s)`)
      } else {
        addMessage("assistant", "Je n'ai trouvé aucun luminaire similaire. Essayez une autre image.")
        toast.info("Aucun résultat trouvé")
      }
    } catch (error) {
      console.error("Image search error:", error)
      addMessage("assistant", "Désolé, une erreur s'est produite lors de la recherche par image.")
      toast.error("Erreur lors de la recherche par image")
    } finally {
      setIsSearching(false)
    }
  }

  const enrichResultsWithIds = async (results: any[]): Promise<SearchResult[]> => {
    const enriched = await Promise.all(
      results.map(async (result) => {
        const luminaireId = result.luminaireId || result.luminaire_id

        // Extract filename from luminaireId (e.g., "luminaire_3725.jpg")
        const fileName = luminaireId?.split("/").pop()?.toLowerCase() || luminaireId

        let mongoId = null

        // Try to get MongoDB ID
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

  const enrichImageResultsWithIds = async (results: any[]): Promise<SearchResult[]> => {
    const enriched = await Promise.all(
      results.map(async (result) => {
        const imageId = String(result.image_id || "").split("#")[0]
        let imageUrl = "/placeholder.svg"

        if (result.image_url) {
          const urlString = String(result.image_url).trim()
          if (urlString.startsWith("http")) {
            imageUrl = urlString.split("#")[0]
          } else {
            imageUrl = `${API_BASE_URL_IMAGE}/images/${imageId}`
          }
        }

        const fileName = imageId.toLowerCase()
        let luminaireId = null

        if (fileName) {
          try {
            const response = await fetch(`/api/luminaire-by-image?filename=${encodeURIComponent(fileName)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.found) {
                luminaireId = data.luminaireId
              }
            }
          } catch (error) {
            console.error("Error fetching luminaire ID:", error)
          }
        }

        return {
          imageId,
          imageUrl,
          luminaireUrl: luminaireId ? `/luminaires/${luminaireId}` : null,
          luminaireId,
          similarity: result.similarity || 0,
        }
      }),
    )

    return enriched
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)
      handleImageSearch(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-serif text-gray-900 mb-3 text-center">Recherche AI par Image</h1>
          <p className="text-center text-gray-600 mb-8">
            Trouvez des luminaires similaires en décrivant ou en chargeant une photo
          </p>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleTextSearch()
                    }
                  }}
                  placeholder="Décrivez le luminaire..."
                  className="w-full h-20 p-4 pr-12 rounded-xl border border-gray-300 text-sm md:text-base resize-none focus:ring-2 focus:ring-[#8b7355] focus:border-transparent"
                  disabled={isSearching}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 bottom-2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={isSearching}
                >
                  <Upload className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <Button
                onClick={handleTextSearch}
                disabled={!inputValue.trim() || isSearching}
                className="h-12 md:h-auto px-6 rounded-xl text-white self-end"
                style={{ backgroundColor: "#8b7355" }}
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>

            {!user ? (
              <div className="text-center text-gray-500 text-sm mt-4 md:mt-8 px-2 md:px-4">
                Connectez-vous pour sauvegarder vos conversations
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-4 md:mt-8 px-2 md:px-4">Aucune conversation</div>
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
                        <p className="text-sm md:text-base text-gray-800 truncate font-medium">{conv.title}</p>
                        <p className="text-xs md:text-sm text-gray-500">
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

          {currentConversation && (
            <div className="space-y-4 md:space-y-6">
              {currentConversation.messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] md:max-w-[80%] ${message.role === "user" ? "bg-amber-100" : "bg-white border border-gray-200"} rounded-2xl p-3 md:p-4`}
                  >
                    {message.role === "user" && (
                      <>
                        {message.imageUrl ? (
                          <div className="space-y-2">
                            <p className="text-sm md:text-base text-gray-600">Image uploadée :</p>
                            <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden">
                              <Image
                                src={message.imageUrl || "/placeholder.svg"}
                                alt="Uploaded"
                                fill
                                className="object-cover"
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm md:text-base text-gray-800">{message.content}</p>
                        )}
                        <p className="text-xs md:text-sm text-gray-500 mt-2">
                          {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </>
                    )}

                    {message.role === "assistant" && (
                      <>
                        <p className="text-sm md:text-base text-gray-800 mb-3 md:mb-4">{message.content}</p>

                        {message.results && message.results.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
                            {message.results.slice(0, 3).map((result, index) => {
                              if (!result.luminaireId) return null

                              return (
                                <Link key={index} href={`/luminaires/${result.luminaireId}`} className="block group">
                                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                                    <div className="relative w-full h-48 md:h-64 bg-slate-100">
                                      <Image
                                        src={result.imageUrl || "/placeholder.svg"}
                                        alt={result.nom || result.imageId || "Luminaire"}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        unoptimized
                                      />
                                    </div>
                                    <div className="p-3 md:p-4 space-y-1 md:space-y-2">
                                      <h4 className="font-semibold text-gray-900 text-sm md:text-lg line-clamp-2">
                                        {result.nom || result.imageId || "Luminaire"}
                                      </h4>
                                      {result.artiste && (
                                        <p className="text-sm md:text-base text-gray-600">
                                          {result.artiste}
                                          {result.annee && ` • ${result.annee}`}
                                        </p>
                                      )}
                                      {result.similarity && (
                                        <p className="text-sm md:text-base font-medium" style={{ color: "#8b7355" }}>
                                          {Math.round(result.similarity * 100)}% similaire
                                        </p>
                                      )}
                                    </div>
                                  </Card>
                                </Link>
                              )
                            })}
                          </div>
                        )}

                        <p className="text-xs md:text-sm text-gray-500 mt-2">
                          {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {isSearching && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl p-3 md:p-4">
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" style={{ color: "#8b7355" }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {!user && (
            <p className="text-sm md:text-base text-gray-500 mt-2 text-center">
              Connectez-vous pour utiliser la recherche
            </p>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      <MobileFooter />
    </div>
  )
}
