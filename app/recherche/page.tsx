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

  // Charger les conversations depuis localStorage
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`conversations_${user.uid}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        const hydrated = parsed.map((conv: any) => ({
          ...conv,
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

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation?.messages])

  // Sauvegarder les conversations
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

  // Charger une conversation
  const loadConversation = (conv: Conversation) => {
    setCurrentConversation(conv)
    setInputValue("")
    setSelectedImage(null)
    setImagePreview(null)
  }

  // Supprimer une conversation
  const deleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id)
    setConversations(updated)
    saveConversations(updated)
    if (currentConversation?.id === id) {
      setCurrentConversation(null)
    }
  }

  // Ajouter un message à la conversation
  const addMessage = (role: "user" | "assistant", content: string, imageUrl?: string, results?: SearchResult[]) => {
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
        updatedAt: new Date(),
      }
    } else {
      updatedConversation = {
        id: Date.now().toString(),
        title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
        messages: [message],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    setCurrentConversation(updatedConversation)

    // Mettre à jour la liste des conversations
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

  // Recherche par texte
  const handleTextSearch = async () => {
    if (!inputValue.trim()) return

    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche")
      return
    }

    if (userData?.role === "free") {
      const canProceed = await incrementSearchCount()
      if (!canProceed) return
    }

    addMessage("user", inputValue)
    const userQuery = inputValue
    setInputValue("")
    setIsSearching(true)

    try {
      const response = await fetch(`${API_BASE_URL_TEXT}/api/search_text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userQuery,
          top_k: 10, // 10 résultats au lieu de 5
        }),
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
        const enrichedResults = await enrichResultsWithIds(data.results)

        addMessage(
          "assistant",
          `J'ai trouvé ${enrichedResults.length} luminaire(s) correspondant à votre recherche :`,
          undefined,
          enrichedResults,
        )

        toast.success(`${enrichedResults.length} luminaire(s) trouvé(s)`)
      } else {
        addMessage(
          "assistant",
          "Je n'ai trouvé aucun luminaire correspondant à votre recherche. Essayez une autre description.",
        )
        toast.info("Aucun résultat trouvé")
      }
    } catch (error) {
      console.error("Search error:", error)
      addMessage("assistant", "Désolé, une erreur s'est produite lors de la recherche. Veuillez réessayer.")
      toast.error("Erreur lors de la recherche")
    } finally {
      setIsSearching(false)
    }
  }

  // Recherche par image
  const handleImageSearch = async (file: File) => {
    if (!user) {
      toast.error("Connexion requise pour utiliser la recherche")
      return
    }

    if (userData?.role === "free") {
      const canProceed = await incrementSearchCount()
      if (!canProceed) return
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
      formData.append("top_k", "10") // 10 résultats

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

  // Enrichir les résultats avec les IDs MongoDB
  const enrichResultsWithIds = async (results: any[]): Promise<SearchResult[]> => {
    const enriched = await Promise.all(
      results.map(async (result) => {
        const imageUrl = result.image_url?.startsWith("http")
          ? result.image_url
          : `${API_BASE_URL_TEXT}${result.image_url}`

        const fileName = imageUrl.split("/").pop()?.toLowerCase()
        let luminaireId = null

        if (fileName) {
          try {
            const response = await fetch(`/api/images/filename/${fileName}`)
            if (response.ok) {
              const data = await response.json()
              luminaireId = data.luminaireId
            }
          } catch (error) {
            console.error("Error fetching luminaire ID:", error)
          }
        }

        return {
          imageUrl,
          luminaireUrl: luminaireId ? `/luminaires/${luminaireId}` : null,
          luminaireId,
          nom: result.nom || "Sans nom",
          artiste: result.artiste || "Inconnu",
          annee: result.annee === null ? "Non spécifié" : String(result.annee),
          similarity: result.similarity || 0,
        }
      }),
    )

    return enriched
  }

  // Enrichir les résultats d'image avec les IDs
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
            const response = await fetch(`/api/images/filename/${fileName}`)
            if (response.ok) {
              const data = await response.json()
              luminaireId = data.luminaireId
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      <div className="flex h-[calc(100vh-4rem)]">
        <div
          className={`${
            showHistory ? "w-80" : "w-0"
          } transition-all duration-300 bg-white border-r border-slate-200 overflow-hidden flex flex-col`}
        >
          <div className="p-4 border-b border-slate-200">
            <Button onClick={createNewConversation} className="w-full" style={{ backgroundColor: "#f2d895" }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle conversation
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {!user ? (
              <div className="text-center text-slate-500 text-sm mt-8 px-4">
                Connectez-vous pour sauvegarder vos conversations
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-slate-500 text-sm mt-8 px-4">Aucune conversation</div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg cursor-pointer group transition-colors relative ${
                      currentConversation?.id === conv.id
                        ? "bg-amber-50 border-2 border-amber-200"
                        : "hover:bg-slate-100"
                    }`}
                    onClick={() => loadConversation(conv)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate font-medium">{conv.title}</p>
                        <p className="text-xs text-slate-500">
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
                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zone principale */}
        <div className="flex-1 flex flex-col">
          {/* En-tête */}
          <div className="p-6 bg-white border-b border-slate-200">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-serif text-slate-800 mb-2" style={{ color: "#f2d895" }}>
                Recherche de Luminaires
              </h1>
              <p className="text-slate-600">
                {currentConversation
                  ? "Continuez votre recherche ou affinez les résultats"
                  : "Commencez une nouvelle recherche par texte ou par image"}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6">
              {/* Message d'accueil si pas de conversation */}
              {!currentConversation && !isSearching && (
                <div className="text-center mt-20">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10" style={{ color: "#f2d895" }} />
                  </div>
                  <h2 className="text-2xl font-serif text-slate-800 mb-3">Comment puis-je vous aider ?</h2>
                  <p className="text-slate-600 mb-8">
                    Décrivez le luminaire que vous recherchez ou téléversez une image
                  </p>
                </div>
              )}

              {currentConversation && (
                <div className="space-y-6">
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] ${message.role === "user" ? "bg-amber-100" : "bg-white border border-slate-200"} rounded-2xl p-4`}
                      >
                        {/* Message utilisateur */}
                        {message.role === "user" && (
                          <>
                            {message.imageUrl ? (
                              <div className="space-y-2">
                                <p className="text-sm text-slate-600">Image uploadée :</p>
                                <div className="relative w-48 h-48 rounded-lg overflow-hidden">
                                  <Image
                                    src={message.imageUrl || "/placeholder.svg"}
                                    alt="Uploaded"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                            ) : (
                              <p className="text-slate-800">{message.content}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-2">
                              {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </>
                        )}

                        {/* Message assistant */}
                        {message.role === "assistant" && (
                          <>
                            <p className="text-slate-800 mb-4">{message.content}</p>

                            {message.results && message.results.length > 0 && (
                              <div className="grid grid-cols-2 gap-4 mt-4">
                                {message.results.map((result, index) => (
                                  <div key={index}>
                                    {result.luminaireId ? (
                                      <Link href={`/luminaires/${result.luminaireId}`} className="block group">
                                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                                          <div className="relative h-40 bg-slate-100">
                                            <Image
                                              src={result.imageUrl || "/placeholder.svg"}
                                              alt={result.nom || result.imageId || "Luminaire"}
                                              fill
                                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                          </div>
                                          <div className="p-3">
                                            <h4 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-1">
                                              {result.nom || result.imageId || "Luminaire"}
                                            </h4>
                                            {result.artiste && (
                                              <p className="text-xs text-slate-600">
                                                {result.artiste}
                                                {result.annee && ` • ${result.annee}`}
                                              </p>
                                            )}
                                            {result.similarity && (
                                              <p className="text-xs font-medium mt-1" style={{ color: "#c4a363" }}>
                                                {Math.round(result.similarity * 100)}% similaire
                                              </p>
                                            )}
                                          </div>
                                        </Card>
                                      </Link>
                                    ) : (
                                      <Card className="overflow-hidden opacity-75">
                                        <div className="relative h-40 bg-slate-100">
                                          <Image
                                            src={result.imageUrl || "/placeholder.svg"}
                                            alt={result.nom || result.imageId || "Luminaire"}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                        <div className="p-3">
                                          <h4 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-1">
                                            {result.nom || result.imageId || "Luminaire"}
                                          </h4>
                                          <p className="text-xs text-slate-500">Fiche non disponible</p>
                                        </div>
                                      </Card>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <p className="text-xs text-slate-500 mt-2">
                              {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {isSearching && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#f2d895" }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Barre de saisie fixe en bas */}
          <div className="border-t border-slate-200 bg-white p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3 items-end">
                {/* Aperçu de l'image */}
                {imagePreview && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={imagePreview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                  </div>
                )}

                {/* Zone de saisie */}
                <div className="flex-1 relative">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleTextSearch()
                      }
                    }}
                    placeholder="Décrivez le luminaire ou affinez votre recherche..."
                    className="pr-12 h-12 rounded-xl"
                    disabled={isSearching}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    disabled={isSearching}
                  >
                    <Upload className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Bouton envoyer */}
                <Button
                  onClick={handleTextSearch}
                  disabled={!inputValue.trim() || isSearching}
                  className="h-12 px-6 rounded-xl text-white"
                  style={{ backgroundColor: "#f2d895" }}
                >
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>

              {/* Messages d'info */}
              {!user && (
                <p className="text-xs text-slate-500 mt-2 text-center">Connectez-vous pour utiliser la recherche</p>
              )}
              {user && userData?.role === "free" && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  {3 - (userData.searchCount || 0)} recherche(s) restante(s) ce mois-ci •{" "}
                  <Link href="/pricing" className="underline">
                    Passer à Premium
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
    </div>
  )
}
