"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Plus, X, Upload, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

const API_ORCHESTRATOR = "https://gersaint-multimodal-844978726064.europe-west1.run.app"
const IMAGE_PREFIX = "https://gersaint-multimodal-844978726064.europe-west1.run.app"

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
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
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

  // Handle search
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

      const response = await fetch(API_ORCHESTRATOR, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Erreur lors de la recherche")

      const data = await response.json()
      const rawResults = data.results || []

      const enrichedResults: SearchResult[] = await Promise.all(
        rawResults.map(async (result: any) => {
          const metadata = result.metadata || {}
          const imageUrl = result.imageUrl || result.image_url || result.image || result.lien_site || ""
          const fullImageUrl = imageUrl.startsWith("/") ? `${IMAGE_PREFIX}${imageUrl}` : imageUrl

          const filenameWithExt = imageUrl.split("/").pop() || ""
          const imageName = filenameWithExt.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "")

          let luminaireId = result.luminaireId || null
          let apiMetadata: SearchResult | null = null

          if (imageName && !luminaireId) {
            try {
              const metaResponse = await fetch(`/api/luminaire-by-image?filename=${encodeURIComponent(imageName)}`)
              const metaData = await metaResponse.json()
              if (metaData.success && metaData.luminaireId) {
                luminaireId = metaData.luminaireId
                apiMetadata = {
                  luminaireId: metaData.luminaireId,
                  nom: metaData.metadata?.nom,
                  artiste: metaData.metadata?.artiste,
                  annee: metaData.metadata?.annee,
                }
              }
            } catch (error) {
              console.error("Error fetching metadata:", error)
            }
          }

          const extractedNom =
            apiMetadata?.nom ||
            metadata.nom ||
            metadata.name ||
            metadata.title ||
            metadata.modele ||
            result.nom ||
            result.name ||
            result.title ||
            result.modele ||
            imageName ||
            "Luminaire"

          const extractedArtiste =
            apiMetadata?.artiste ||
            metadata.artiste ||
            metadata.artist ||
            metadata.designer ||
            metadata.createur ||
            metadata.auteur ||
            result.artiste ||
            result.artist ||
            result.designer ||
            result.createur ||
            result.auteur ||
            "Inconnu"

          const extractedAnnee =
            apiMetadata?.annee ||
            metadata.annee ||
            metadata.year ||
            metadata.date ||
            metadata.periode ||
            metadata.epoque ||
            result.annee ||
            result.year ||
            result.date ||
            result.periode ||
            result.epoque ||
            ""

          return {
            nom: extractedNom,
            artiste: extractedArtiste,
            annee: extractedAnnee,
            luminaireId,
            imageUrl: fullImageUrl,
          }
        }),
      )

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `J'ai trouvé ${enrichedResults.length} luminaire(s) correspondant à votre recherche :`,
        results: enrichedResults,
        timestamp: new Date(),
      }

      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, assistantMessage],
        updatedAt: new Date(),
      }

      setCurrentConversation(finalConversation)

      const allConversations = currentConversation
        ? conversations.map((c) => (c.id === finalConversation.id ? finalConversation : c))
        : [finalConversation, ...conversations]

      setConversations(allConversations)
      saveConversations(allConversations)
    } catch (error) {
      console.error("Search error:", error)
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
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50 flex items-center justify-center p-4">
        <div className="glass-morphism rounded-3xl p-8 md:p-12 max-w-md w-full text-center animate-fade-in">
          <h2 className="text-3xl font-light mb-4 text-foreground">Connexion requise</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Connectez-vous pour accéder à la recherche IA et profiter de toutes les fonctionnalités.
          </p>
          <Button onClick={() => router.push("/")} size="lg" className="w-full rounded-full">
            Se connecter
          </Button>
        </div>
      </div>
    )
  }

  if (userData?.role === "free") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50 flex items-center justify-center p-4">
        <div className="glass-morphism rounded-3xl p-8 md:p-12 max-w-md w-full text-center animate-fade-in">
          <h2 className="text-3xl font-light mb-4 text-foreground">Fonctionnalité Premium</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            La recherche multimodale avancée est réservée aux abonnés Premium. Passez à Premium pour accéder à cette
            fonctionnalité.
          </p>
          <Button onClick={() => router.push("/pricing")} size="lg" className="w-full rounded-full">
            Voir les tarifs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-secondary via-background to-secondary/50">
      <div
        className={`${
          showSidebar ? "w-72" : "w-0"
        } transition-all duration-300 border-r border-border/50 glass-morphism overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-border/30">
          <Button
            onClick={createNewConversation}
            size="lg"
            className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => loadConversation(conv)}
              className={`p-4 rounded-xl cursor-pointer hover:bg-muted/50 transition-all duration-200 group ${
                currentConversation?.id === conv.id ? "bg-accent/10 border border-accent/20" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground mb-1">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {conv.messages.length} message{conv.messages.length > 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 shrink-0"
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
        <div className="h-16 border-b border-border/30 glass-morphism flex items-center px-6">
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)} className="rounded-full">
            {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </Button>
          <h1 className="text-xl font-light ml-4 text-foreground">Recherche IA</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {!currentConversation && (
            <div className="flex items-center justify-center h-full animate-fade-in">
              <div className="text-center max-w-xl">
                <h2 className="text-4xl font-light mb-4 text-foreground">Commencez une recherche</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Décrivez un luminaire avec vos mots ou uploadez une image pour découvrir des pièces similaires dans
                  notre collection
                </p>
              </div>
            </div>
          )}

          {currentConversation?.messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className={`${message.role === "user" ? "max-w-2xl" : "w-full max-w-5xl"} rounded-2xl p-6 ${
                  message.role === "user"
                    ? "bg-accent/10 border border-accent/20 text-foreground"
                    : "glass-morphism text-foreground"
                }`}
              >
                {message.content && <p className="mb-4 text-base leading-relaxed">{message.content}</p>}

                {message.imageUrl && (
                  <div className="mb-4">
                    <Image
                      src={message.imageUrl || "/placeholder.svg"}
                      alt="Uploaded"
                      width={300}
                      height={300}
                      className="rounded-xl object-cover shadow-lg border border-border/20"
                    />
                  </div>
                )}

                {message.results && message.results.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 w-full">
                    {message.results.map((result, idx) => {
                      const CardWrapper = result.luminaireId ? Link : "div"
                      const cardProps = result.luminaireId ? { href: `/luminaires/${result.luminaireId}` } : {}

                      return (
                        <CardWrapper
                          key={idx}
                          {...cardProps}
                          className={`block glass-morphism rounded-2xl overflow-hidden transition-all duration-300 ${
                            result.luminaireId
                              ? "hover:shadow-2xl hover:scale-105 cursor-pointer"
                              : "opacity-60 cursor-not-allowed"
                          }`}
                        >
                          {result.imageUrl && (
                            <div className="relative h-72 w-full bg-background/50 flex items-center justify-center p-6">
                              <Image
                                src={result.imageUrl || "/placeholder.svg"}
                                alt={result.nom || "Luminaire"}
                                fill
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          )}
                          <div className="p-5 space-y-2">
                            <p className="font-semibold text-lg text-foreground">{result.nom}</p>
                            <p className="text-base text-muted-foreground">{result.artiste}</p>
                            {result.annee && <p className="text-sm font-medium text-accent">{result.annee}</p>}
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

        <div className="border-t border-border/30 glass-morphism p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {imagePreview && (
              <div className="mb-4 relative inline-block animate-scale-in">
                <Image
                  src={imagePreview || "/placeholder.svg"}
                  alt="Preview"
                  width={120}
                  height={120}
                  className="rounded-xl object-cover shadow-lg border-2 border-accent/30"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg"
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
                className="rounded-full h-12 w-12 border-2 hover:bg-accent/10 hover:border-accent"
              >
                <Upload className="w-5 h-5" />
              </Button>

              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Décrivez le luminaire ou affinez votre recherche..."
                disabled={isSearching}
                className="flex-1 h-12 border-2 rounded-full px-6 focus:border-accent bg-background/50 text-base"
              />

              <Button
                onClick={handleSearch}
                disabled={isSearching || (!inputValue.trim() && !selectedImage)}
                size="icon"
                className="rounded-full h-12 w-12 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg"
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent-foreground/30 border-t-accent-foreground"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
