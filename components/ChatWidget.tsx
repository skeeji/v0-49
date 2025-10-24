"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

const API_BASE_URL = "https://chatbot-984654216979.europe-west1.run.app"

interface SearchResult {
  nom: string
  artiste: string
  annee: string
  image_url: string
  similarity: number
  lien_site: string
}

interface Message {
  type: "user" | "bot" | "results"
  content: string
  results?: SearchResult[]
  timestamp: Date
}

type ApiStatus = "ready" | "loading" | "offline"

// Fonction pour parser le JSON avec des valeurs NaN
function parseJSONWithNaN(text: string) {
  const cleanedText = text.replace(/:\s*NaN/g, ": null")
  return JSON.parse(cleanedText)
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [luminaireIdCache, setLuminaireIdCache] = useState<Record<string, string>>({})

  // Health check au chargement
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        })
        if (response.ok) {
          setApiStatus("ready")
        } else {
          setApiStatus("offline")
        }
      } catch (error) {
        console.error("Health check failed:", error)
        setApiStatus("offline")
      }
    }
    checkHealth()
  }, [])

  // Message de bienvenue au premier lancement
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      setMessages([
        {
          type: "bot",
          content: "Bonjour ! Décrivez l'objet que vous recherchez.",
          timestamp: new Date(),
        },
      ])
      setHasInitialized(true)
    }
  }, [isOpen, hasInitialized])

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Fonction pour extraire l'ID du lien_site s'il existe
  const extractIdFromLienSite = (lienSite: string): string | null => {
    if (!lienSite) return null

    // Essayer d'extraire l'ID depuis l'URL (format: /luminaires/{id} ou luminaires/{id})
    const match = lienSite.match(/luminaires\/([a-f0-9]{24})/i)
    if (match && match[1]) {
      return match[1]
    }

    return null
  }

  // Fonction pour rechercher l'ID par nom d'image (avec cache)
  const findLuminaireIdByImage = async (imageUrl: string): Promise<string | null> => {
    if (!imageUrl) return null

    const fileName = imageUrl.split("/").pop()?.toLowerCase().trim()
    if (!fileName) return null

    // Vérifier le cache d'abord
    if (luminaireIdCache[fileName]) {
      console.log(`✓ Cache hit for ${fileName}:`, luminaireIdCache[fileName])
      return luminaireIdCache[fileName]
    }

    // Rechercher dans la base via l'API avec un filtre sur le nom d'image
    try {
      const response = await fetch(`/api/luminaires?search=${encodeURIComponent(fileName)}&limit=1`)
      if (response.ok) {
        const data = await response.json()
        if (data.luminaires && data.luminaires.length > 0) {
          const luminaire = data.luminaires[0]

          // Vérifier si ce luminaire contient l'image recherchée
          const hasImage = Object.values(luminaire).some(
            (value) => typeof value === "string" && value.toLowerCase().includes(fileName),
          )

          if (hasImage && luminaire._id) {
            const id = luminaire._id.toString()
            // Mettre en cache
            setLuminaireIdCache((prev) => ({ ...prev, [fileName]: id }))
            console.log(`✓ Found and cached ${fileName}:`, id)
            return id
          }
        }
      }
    } catch (error) {
      console.error("Error finding luminaire by image:", error)
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/search_text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: inputValue,
          top_k: 5,
        }),
      })

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error("Service temporairement indisponible. Veuillez réessayer dans quelques instants.")
        }
        throw new Error("Erreur lors de la recherche")
      }

      const text = await response.text()

      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.log("JSON parsing error, cleaning NaN values...")
        data = parseJSONWithNaN(text)
      }

      if (data.results && data.results.length > 0) {
        const cleanedResults = data.results.map((result: any) => ({
          nom: result.nom || "Sans nom",
          artiste: result.artiste || "Inconnu",
          annee: result.annee === null || isNaN(result.annee) ? "Non spécifié" : String(result.annee),
          image_url: result.image_url || "",
          similarity: result.similarity || 0,
          lien_site: result.lien_site || "",
        }))

        // Résoudre les IDs en parallèle pour tous les résultats
        const resultsWithIds = await Promise.all(
          cleanedResults.map(async (result) => {
            // Essayer d'abord d'extraire l'ID du lien_site
            let luminaireId = extractIdFromLienSite(result.lien_site)

            // Si pas trouvé, chercher par nom d'image
            if (!luminaireId) {
              luminaireId = await findLuminaireIdByImage(result.image_url)
            }

            return {
              ...result,
              luminaireId,
            }
          }),
        )

        const resultsMessage: Message = {
          type: "results",
          content: `J'ai trouvé ${resultsWithIds.length} résultat(s) pour votre recherche :`,
          results: resultsWithIds,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, resultsMessage])
      } else {
        const noResultsMessage: Message = {
          type: "bot",
          content: "Aucun résultat trouvé pour votre recherche. Essayez avec d'autres mots-clés.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, noResultsMessage])
      }
    } catch (error) {
      console.error("Search error:", error)
      const errorMessage: Message = {
        type: "bot",
        content: error instanceof Error ? error.message : "Une erreur est survenue. Veuillez réessayer.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = () => {
    switch (apiStatus) {
      case "ready":
        return "bg-green-500"
      case "loading":
        return "bg-yellow-500"
      case "offline":
        return "bg-red-500"
    }
  }

  const getStatusText = () => {
    switch (apiStatus) {
      case "ready":
        return "Prête"
      case "loading":
        return "Chargement"
      case "offline":
        return "Hors Ligne"
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ backgroundColor: "#f2d895" }}
          className="fixed bottom-6 right-6 z-50 hover:opacity-90 text-gray-800 rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Ouvrir le chat"
        >
          <MessageCircle className="w-6 h-6" />
          {apiStatus === "ready" && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          )}
        </button>
      )}

      {/* Widget de chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] bg-white rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div
            style={{ backgroundColor: "#f2d895" }}
            className="text-gray-800 p-4 rounded-t-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Assistant de Recherche</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                  <span>{getStatusText()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-black/10 rounded-full p-1 transition-colors"
              aria-label="Fermer le chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                {message.type === "user" ? (
                  <div
                    style={{ backgroundColor: "#f2d895" }}
                    className="text-gray-800 rounded-lg px-4 py-2 max-w-[80%]"
                  >
                    {message.content}
                  </div>
                ) : message.type === "results" && message.results ? (
                  <div className="w-full space-y-3">
                    <div className="bg-white rounded-lg px-4 py-2 text-gray-800 text-sm">{message.content}</div>
                    {message.results.map((result: any, idx) => {
                      const luminaireId = result.luminaireId

                      return (
                        <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
                          <CardContent className="p-0">
                            <div className="flex gap-3 p-3">
                              {luminaireId ? (
                                <Link
                                  href={`/luminaires/${luminaireId}`}
                                  className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                  <img
                                    src={
                                      result.image_url.startsWith("http")
                                        ? result.image_url
                                        : `${API_BASE_URL}${result.image_url}`
                                    }
                                    alt={result.nom}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = "/placeholder.svg?height=80&width=80"
                                    }}
                                  />
                                </Link>
                              ) : (
                                <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                  <img
                                    src={
                                      result.image_url.startsWith("http")
                                        ? result.image_url
                                        : `${API_BASE_URL}${result.image_url}`
                                    }
                                    alt={result.nom}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = "/placeholder.svg?height=80&width=80"
                                    }}
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                {luminaireId ? (
                                  <Link href={`/luminaires/${luminaireId}`} className="hover:underline">
                                    <h4 className="font-semibold text-sm text-gray-900 truncate">{result.nom}</h4>
                                  </Link>
                                ) : (
                                  <h4 className="font-semibold text-sm text-gray-900 truncate">{result.nom}</h4>
                                )}
                                <p className="text-xs text-gray-600">
                                  {result.artiste} • {result.annee}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs font-medium" style={{ color: "#c4a363" }}>
                                    {(result.similarity * 100).toFixed(0)}% similaire
                                  </span>
                                  {result.lien_site && (
                                    <a
                                      href={result.lien_site}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs hover:underline"
                                      style={{ color: "#c4a363" }}
                                    >
                                      Voir plus →
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg px-4 py-2 max-w-[80%] text-gray-800">{message.content}</div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#c4a363" }} />
                  <span className="text-sm text-gray-600">Recherche en cours...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t rounded-b-lg">
            <div className="flex gap-2">
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Décrivez l'objet recherché..."
                disabled={isLoading || apiStatus === "offline"}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim() || apiStatus === "offline"}
                style={{ backgroundColor: "#f2d895" }}
                className="hover:opacity-90 text-gray-800"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
