"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

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

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

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

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const resultsMessage: Message = {
          type: "results",
          content: `J'ai trouvé ${data.results.length} résultat(s) pour votre recherche :`,
          results: data.results,
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
          className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
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
          <div className="bg-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
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
              className="hover:bg-indigo-700 rounded-full p-1 transition-colors"
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
                  <div className="bg-indigo-600 text-white rounded-lg px-4 py-2 max-w-[80%]">{message.content}</div>
                ) : message.type === "results" && message.results ? (
                  <div className="w-full space-y-3">
                    <div className="bg-white rounded-lg px-4 py-2 text-gray-800 text-sm">{message.content}</div>
                    {message.results.map((result, idx) => (
                      <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                          <div className="flex gap-3 p-3">
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
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-gray-900 truncate">{result.nom}</h4>
                              <p className="text-xs text-gray-600">
                                {result.artiste} • {result.annee}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-indigo-600 font-medium">
                                  {(result.similarity * 100).toFixed(0)}% similaire
                                </span>
                                {result.lien_site && (
                                  <a
                                    href={result.lien_site}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-indigo-600 hover:underline"
                                  >
                                    Voir plus →
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg px-4 py-2 max-w-[80%] text-gray-800">{message.content}</div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
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
                className="bg-indigo-600 hover:bg-indigo-700"
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
