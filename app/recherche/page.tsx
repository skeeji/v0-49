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
  designer?: string
  annee?: string
  year?: string
  date?: string
  luminaireId?: string
  imageUrl?: string
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

  // Load conversations from localStorage
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

  // Save conversations to localStorage
  const saveConversations = (convs: Conversation[]) => {
    if (user) {
      localStorage.setItem(`conversations_${user.uid}`, JSON.stringify(convs))
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation?.messages])

  // Create new conversation
  const createNewConversation = () => {
    setCurrentConversation(null)
    setInputValue("")
    setSelectedImage(null)
    setImagePreview(null)
  }

  // Load conversation
  const loadConversation = (conv: Conversation) => {
    setCurrentConversation(conv)
    setInputValue("")
    setSelectedImage(null)
    setImagePreview(null)
  }

  // Delete conversation
  const deleteConversation = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = conversations.filter((c) => c.id !== convId)
    setConversations(updated)
    saveConversations(updated)
    if (currentConversation?.id === convId) {
      setCurrentConversation(null)
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)
    }
  }

  // Remove selected image
  const removeSelectedImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Get luminaire metadata by filename
  const getLuminaireMetadata = async (filename: string): Promise<SearchResult | null> => {
    try {
      const response = await fetch(`/api/luminaire-by-image?filename=${encodeURIComponent(filename)}`)
      const data = await response.json()

      if (data.success && data.luminaireId) {
        return { luminaireId: data.luminaireId }
      }
      return null
    } catch (error) {
      console.error("Error fetching luminaire metadata:", error)
      return null
    }
  }

  // Handle search
  const handleSearch = async () => {
    if (!inputValue.trim() && !selectedImage) return
    if (isSearching) return

    // Check if user can search
    if (!user || (userData?.role === "free" && !userData.searchCount)) {
      return
    }

    setIsSearching(true)

    try {
      // Create user message
      const userContent = inputValue.trim() || "Recherche par image"
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userContent,
        imageUrl: imagePreview || undefined,
        timestamp: new Date(),
      }

      // Update or create conversation
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

      // Clear input
      const searchText = inputValue
      const searchImage = selectedImage
      setInputValue("")
      setSelectedImage(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Call API
      const formData = new FormData()
      formData.append("query", searchText || "")
      if (searchImage) {
        formData.append("image", searchImage)
      }
      formData.append("top_k", "5")

      const response = await fetch(API_ORCHESTRATOR, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Erreur lors de la recherche")

      const data = await response.json()
      const rawResults = data.results || []

      // Enrich results with metadata
      const enrichedResults: SearchResult[] = await Promise.all(
        rawResults.map(async (result: any) => {
          // Extract image filename from various possible fields
          const imageUrl = result.imageUrl || result.image_url || result.lien_site || ""
          const imageName =
            imageUrl
              .split("/")
              .pop()
              ?.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "") || ""

          // Get metadata from local API
          const metadata = imageName ? await getLuminaireMetadata(imageName) : null

          // Build final result
          const finalResult: SearchResult = {
            nom: result.nom || result.name || result.title || result.modele || "Sans nom",
            artiste:
              result.artiste || result.artist || result.designer || result.createur || result.auteur || "Inconnu",
            annee: result.annee || result.year || result.date || result.periode || result.epoque || "",
            luminaireId: metadata?.luminaireId || result.luminaireId || null,
            imageUrl: imageUrl.startsWith("/") ? `${IMAGE_PREFIX}${imageUrl}` : imageUrl,
          }

          return finalResult
        }),
      )

      // Filter results with luminaireId
      const validResults = enrichedResults.filter((r) => r.luminaireId)

      // Create assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `J'ai trouvé ${validResults.length} luminaire(s) correspondant à votre recherche :`,
        results: validResults,
        timestamp: new Date(),
      }

      // Update conversation
      updatedConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, assistantMessage],
        updatedAt: new Date(),
      }

      setCurrentConversation(updatedConversation)

      // Save to conversations list
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
    } catch (error) {
      console.error("Search error:", error)
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Désolé, une erreur est survenue lors de la recherche. Veuillez réessayer.",
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

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  // Check access
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "w-64" : "w-0"
        } transition-all duration-300 border-r border-border bg-card overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-border">
          <Button onClick={createNewConversation} className="w-full bg-transparent" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => loadConversation(conv)}
              className={`p-3 mb-2 rounded-lg cursor-pointer hover:bg-accent transition-colors group ${
                currentConversation?.id === conv.id ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
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

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center px-4">
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </Button>
          <h1 className="text-lg font-semibold ml-4">Recherche IA</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentConversation && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-2">Commencez une nouvelle recherche</p>
                <p className="text-sm">Décrivez un luminaire ou uploadez une image</p>
              </div>
            </div>
          )}

          {currentConversation?.messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-3xl ${
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                } rounded-lg p-4`}
              >
                {message.content && <p className="mb-2">{message.content}</p>}

                {message.imageUrl && (
                  <div className="mb-2">
                    <Image
                      src={message.imageUrl || "/placeholder.svg"}
                      alt="Uploaded"
                      width={200}
                      height={200}
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}

                {message.results && message.results.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {message.results.map((result, idx) => (
                      <Link
                        key={idx}
                        href={`/luminaires/${result.luminaireId}`}
                        className="block bg-background rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow border border-border"
                      >
                        {result.imageUrl && (
                          <div className="relative h-48 w-full">
                            <Image
                              src={result.imageUrl || "/placeholder.svg"}
                              alt={result.nom || "Luminaire"}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="font-semibold text-sm text-foreground truncate">{result.nom}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.artiste}</p>
                          {result.annee && <p className="text-xs text-muted-foreground">{result.annee}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border p-4">
          {imagePreview && (
            <div className="mb-4 relative inline-block">
              <Image
                src={imagePreview || "/placeholder.svg"}
                alt="Preview"
                width={100}
                height={100}
                className="rounded-lg object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={removeSelectedImage}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSearching}>
              <Upload className="w-4 h-4" />
            </Button>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Décrivez le luminaire ou affinez votre recherche..."
              disabled={isSearching}
              className="flex-1"
            />

            <Button onClick={handleSearch} disabled={isSearching || (!inputValue.trim() && !selectedImage)}>
              {isSearching ? "..." : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
