"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Send, Plus, ChevronLeft, ChevronRight, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const API_ORCHESTRATOR = "https://gersaint-multimodal-844978726064.europe-west1.run.app/api/multimodal_search"
const IMAGE_PREFIX = "https://image-similarity-api-590690354412.us-central1.run.app"

interface SearchResult {
  nom?: string
  artiste?: string
  annee?: string
  luminaireId?: string
  imageUrl?: string
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
  const { user, userData } = useAuth()
  const router = useRouter()

  const [inputValue, setInputValue] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showSidebar, setShowSidebar] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`conversations_${user.uid}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setConversations(
            parsed.map((c: any) => ({
              ...c,
              createdAt: new Date(c.createdAt),
              updatedAt: new Date(c.updatedAt),
              messages: c.messages.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              })),
            })),
          )
        } catch (error) {
          console.error("Error loading conversations:", error)
        }
      }
    }
  }, [user])

  const saveConversations = (convs: Conversation[]) => {
    if (user) {
      localStorage.setItem(`conversations_${user.uid}`, JSON.stringify(convs))
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation?.messages])

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

  const deleteConversation = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = conversations.filter((c) => c.id !== convId)
    setConversations(updated)
    saveConversations(updated)
    if (currentConversation?.id === convId) {
      setCurrentConversation(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)
    }
  }

  const removeSelectedImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSearch = async () => {
    if (!inputValue.trim() && !selectedImage) return
    if (isSearching) return

    if (!user || (userData?.role === "free" && !userData.searchCount)) {
      return
    }

    setIsSearching(true)

    try {
      const userContent = inputValue.trim() || "Recherche par image"
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userContent,
        imageUrl: imagePreview || undefined,
        timestamp: new Date(),
      }

      let updatedConversation: Conversation
      if (currentConversation) {
        updatedConversation = {
          ...currentConversation,
          messages: [...currentConversation.messages, userMessage],
          updatedAt: new Date(),
        }
      } else {
        updatedConversation = {
          id: Date.now().toString(),
          title: userContent.slice(0, 50) + (userContent.length > 50 ? "..." : ""),
          messages: [userMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }

      setCurrentConversation(updatedConversation)

      const searchText = inputValue
      const searchImage = selectedImage
      setInputValue("")
      setSelectedImage(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      const formData = new FormData()
      formData.append("query", searchText || "")
      if (searchImage) {
        formData.append("image", searchImage)
      }
      formData.append("top_k", "3")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 40000) // 40 second timeout

      try {
        const response = await fetch(API_ORCHESTRATOR, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) throw new Error("Erreur lors de la recherche")

        const data = await response.json()
        const rawResults = data.results || []

        const enrichedResults: SearchResult[] = rawResults.map((result: any) => {
          const metadata = result.metadata || result

          const imageUrl = result.imageUrl || result.image_url || result.image || ""
          const fullImageUrl = imageUrl.startsWith("/") ? `${IMAGE_PREFIX}${imageUrl}` : imageUrl

          let luminaireId = result.luminaireId
          if (luminaireId && typeof luminaireId === "string") {
            if (luminaireId.includes(".")) {
              luminaireId = null
            }
          }

          const nom =
            metadata.nom ||
            metadata.name ||
            metadata.title ||
            metadata.modele ||
            result.nom ||
            result.name ||
            "Sans nom"

          const artiste =
            metadata.artiste ||
            metadata.artist ||
            metadata.designer ||
            metadata.createur ||
            result.artiste ||
            result.artist ||
            "Inconnu"

          const annee = metadata.annee || metadata.year || metadata.date || result.annee || result.year || ""

          return {
            nom,
            artiste,
            annee,
            luminaireId,
            imageUrl: fullImageUrl,
          }
        })

        const validResults = enrichedResults

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `J'ai trouvé ${validResults.length} luminaire(s) correspondant à votre recherche :`,
          results: validResults,
          timestamp: new Date(),
        }

        updatedConversation = {
          ...updatedConversation,
          messages: [...updatedConversation.messages, assistantMessage],
          updatedAt: new Date(),
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
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === "AbortError") {
          throw new Error("La recherche a pris trop de temps. Veuillez réessayer.")
        }
        throw fetchError
      }
    } catch (error) {
      console.error("Search error:", error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Désolé, une erreur est survenue lors de la recherche. Veuillez réessayer.",
        timestamp: new Date(),
      }

      if (currentConversation) {
        const updatedConversation = {
          ...currentConversation,
          messages: [...currentConversation.messages, errorMessage],
          updatedAt: new Date(),
        }
        setCurrentConversation(updatedConversation)
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  if (!user || !userData?.role || (userData.role !== "premium" && userData.role !== "admin")) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10" />
        <div className="relative z-20 bg-card border border-border rounded-lg p-8 max-w-md text-center shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Fonctionnalité Premium</h2>
          <p className="text-muted-foreground mb-6">
            Cette fonctionnalité de recherche avancée est réservée aux membres Premium.
          </p>
          <Button onClick={() => router.push("/pricing")} className="w-full">
            Voir les tarifs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div
        className={`${
          showSidebar ? "w-64" : "w-0"
        } transition-all duration-300 border-r border-amber-200 bg-white/80 backdrop-blur-sm overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-amber-200">
          <Button
            onClick={createNewConversation}
            className="w-full"
            style={{ backgroundColor: "#f2d895", color: "white" }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => loadConversation(conv)}
              className={`p-3 mb-2 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors group ${
                currentConversation?.id === conv.id ? "bg-amber-100" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-800">{conv.title}</p>
                  <p className="text-xs text-slate-600">
                    {conv.messages.length} message{conv.messages.length > 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={(e) => deleteConversation(conv.id, e)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-amber-200 bg-white/80 backdrop-blur-sm flex items-center px-4">
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </Button>
          <h1 className="text-lg font-semibold ml-4" style={{ color: "#f2d895" }}>
            Recherche IA
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!currentConversation && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-700">
                <p className="text-xl mb-2 font-serif" style={{ color: "#f2d895" }}>
                  Commencez une nouvelle recherche
                </p>
                <p className="text-sm text-slate-600">Décrivez un luminaire ou uploadez une image</p>
              </div>
            </div>
          )}

          {currentConversation?.messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`${message.role === "user" ? "max-w-3xl" : "w-full"} rounded-2xl p-6 shadow-lg ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-amber-100 to-orange-100 text-slate-800"
                    : "bg-white/90 backdrop-blur-sm text-slate-800"
                }`}
              >
                {message.content && <p className="mb-3 leading-relaxed">{message.content}</p>}

                {message.imageUrl && (
                  <div className="mb-3">
                    <Image
                      src={message.imageUrl || "/placeholder.svg"}
                      alt="Uploaded"
                      width={250}
                      height={250}
                      className="rounded-xl object-cover shadow-md"
                    />
                  </div>
                )}

                {message.results && message.results.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 w-full">
                    {message.results.map((result, idx) => {
                      const CardWrapper = result.luminaireId ? Link : "div"
                      const cardProps = result.luminaireId ? { href: `/luminaires/${result.luminaireId}` } : {}

                      return (
                        <CardWrapper key={idx} {...cardProps}>
                          <div
                            className={`bg-white rounded-3xl overflow-hidden border border-amber-200 transition-all duration-300 h-full flex flex-col ${
                              result.luminaireId ? "hover:shadow-xl hover:scale-105 cursor-pointer" : ""
                            }`}
                          >
                            <div className="relative h-64 bg-white flex items-center justify-center p-4">
                              <Image
                                src={result.imageUrl || "/placeholder.svg"}
                                alt={result.nom || "Luminaire"}
                                width={300}
                                height={300}
                                className="object-contain max-h-full"
                                unoptimized
                              />
                            </div>
                            <div className="p-4 flex-1">
                              {result.nom && result.nom !== "Sans nom" && (
                                <h3 className="text-lg font-bold mb-2 text-slate-800">{result.nom}</h3>
                              )}
                              {result.artiste && result.artiste !== "Inconnu" && (
                                <p className="text-base text-slate-700 mb-1">{result.artiste}</p>
                              )}
                              {result.annee && <p className="text-base font-medium text-amber-600">{result.annee}</p>}
                              {!result.luminaireId && (
                                <p className="text-sm text-slate-500 italic mt-2">Fiche détaillée non disponible</p>
                              )}
                            </div>
                          </div>
                        </CardWrapper>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-amber-200 bg-white/80 backdrop-blur-sm p-4">
          {imagePreview && (
            <div className="mb-4 relative inline-block">
              <Image
                src={imagePreview || "/placeholder.svg"}
                alt="Preview"
                width={120}
                height={120}
                className="rounded-xl object-cover shadow-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg"
                onClick={removeSelectedImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSearching}
              className="border-amber-300 hover:bg-amber-50"
            >
              <Upload className="w-5 h-5" style={{ color: "#f2d895" }} />
            </Button>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Décrivez le luminaire ou affinez votre recherche..."
              disabled={isSearching}
              className="flex-1 border-amber-300 focus:border-amber-400 bg-white"
            />

            <Button
              onClick={handleSearch}
              disabled={isSearching || (!inputValue.trim() && !selectedImage)}
              style={{ backgroundColor: "#f2d895", color: "white" }}
              className="hover:opacity-90"
            >
              {isSearching ? "..." : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
