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
  // Remplace NaN par null avant de parser
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
  const [imageToIdMap, setImageToIdMap] = useState<Record<string, string>>({})

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

  // Charger TOUS les luminaires en faisant plusieurs appels paginés
  useEffect(() => {
    const fetchAllLuminaires = async () => {
      try {
        const allLuminaires: any[] = []
        let page = 1
        let hasMore = true
        const limit = 50

        // Faire des appels paginés jusqu'à récupérer tous les luminaires
        while (hasMore) {
          const response = await fetch(`/api/luminaires?page=${page}&limit=${limit}`)
          if (response.ok) {
            const data = await response.json()
            allLuminaires.push(...data.luminaires)
            hasMore = data.pagination.hasMore
            page++
          } else {
            break
          }
        }

        console.log("Total luminaires fetched:", allLuminaires.length)

        const mapping: Record<string, string> = {}

        allLuminaires.forEach((lum: any) => {
          if (lum._id) {
            // Parcourir TOUTES les propriétés de l'objet luminaire
            Object.keys(lum).forEach((key) => {
              const value = lum[key]

              // Si la clé contient "image" ou "fichier" et que la valeur est une string
              if (
                typeof value === "string" &&
                (key.toLowerCase().includes("image") || key.toLowerCase().includes("fichier")) &&
                (value.endsWith(".jpg") || value.endsWith(".jpeg") || value.endsWith(".png") || value.endsWith(".webp"))
              ) {
                // Extraire le nom de fichier (sans chemin)
                const fileName = value.split("/").pop()?.toLowerCase().trim()
                if (fileName) {
                  mapping[fileName] = lum._id
                }
              }
            })
          }
        })

        console.log("Image to ID mapping created:", Object.keys(mapping).length, "entries")
        console.log("Sample mappings:", Object.keys(mapping).slice(0, 10))
        setImageToIdMap(mapping)
      } catch (error) {
        console.error("Failed to fetch luminaires:", error)
      }
    }
    fetchAllLuminaires()
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
        // Première tentative de parsing normal
        data = JSON.parse(text)
      } catch (parseError) {
        // Si échec, nettoyer les NaN et réessayer
        console.log("JSON parsing error, cleaning NaN values...")
        data = parseJSONWithNaN(text)
      }

      if (data.results && data.results.length > 0) {
        // Nettoyer et normaliser les résultats
        const cleanedResults = data.results.map((result: any) => ({
          nom: result.nom || "Sans nom",
          artiste: result.artiste || "Inconnu",
          annee: result.annee === null || isNaN(result.annee) ? "Non spécifié" : String(result.annee),
          image_url: result.image_url || "",
          similarity: result.similarity || 0,
          lien_site: result.lien_site || "",
        }))

        const resultsMessage: Message = {
          type: "results",
          content: `J'ai trouvé ${cleanedResults.length} résultat(s) pour votre recherche :`,
          results: cleanedResults,
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

  // Fonction pour obtenir l'ID du luminaire à partir du nom de l'image
  const getLuminaireIdFromImage = (imageUrl: string): string | null => {
    if (!imageUrl) {
      console.log("No image URL provided")
      return null
    }

    // Extraire le nom du fichier de l'URL
    const fileName = imageUrl.split("/").pop()
    if (!fileName) {
      console.log("Could not extract filename from URL:", imageUrl)
      return null
    }

    // Normaliser le nom de fichier
    const normalizedFileName = fileName.toLowerCase().trim()

    console.log(`Looking for luminaire with image: ${normalizedFileName}`)
    console.log(`Available mappings count: ${Object.keys(imageToIdMap).length}`)

    // Chercher dans le mapping
    const luminaireId = imageToIdMap[normalizedFileName]

    if (luminaireId) {
      console.log(`✓ Found luminaire ID for image ${fileName}: ${luminaireId}`)
    } else {
      console.log(`✗ No luminaire found for image: ${fileName}`)
      // Afficher quelques clés similaires pour debug
      const similarKeys = Object.keys(imageToIdMap).filter((key) => key.includes(normalizedFileName.split("_")[0]))
      if (similarKeys.length > 0) {
        console.log("Similar keys found:", similarKeys.slice(0, 5))
      }
    }

    return luminaireId || null
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
                    {message.results.map((result, idx) => {
                      const luminaireId = getLuminaireIdFromImage(result.image_url)

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
