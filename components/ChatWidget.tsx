"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface ChatResult {
  nom: string
  artiste: string
  annee: number
  image_url: string
  lien_site: string
  similarity: number
}

interface Message {
  type: "user" | "bot" | "results"
  content: string
  results?: ChatResult[]
  timestamp: Date
}

const API_BASE_URL = "https://chatbot-984654216979.europe-west1.run.app"

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [healthStatus, setHealthStatus] = useState<"loading" | "ready" | "offline">("loading")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Health check on mount
  useEffect(() => {
    checkHealth()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initial bot message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          type: "bot",
          content: "Bonjour ! Décrivez l'objet que vous recherchez.",
          timestamp: new Date(),
        },
      ])
    }
  }, [isOpen])

  const checkHealth = async () => {
    try {
      const response = await fetch("/api/chatbot/health")
      if (response.ok) {
        setHealthStatus("ready")
      } else {
        setHealthStatus("offline")
      }
    } catch (error) {
      setHealthStatus("offline")
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      type: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chatbot/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: input,
          top_k: 5,
        }),
      })

      if (!response.ok) {
        throw new Error("API request failed")
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const resultsMessage: Message = {
          type: "results",
          content: `J'ai trouvé ${data.results.length} résultat(s) correspondant à votre recherche :`,
          results: data.results,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, resultsMessage])
      } else {
        const noResultsMessage: Message = {
          type: "bot",
          content:
            "Désolé, je n'ai trouvé aucun résultat correspondant à votre recherche. Essayez une autre description.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, noResultsMessage])
      }
    } catch (error) {
      console.error("Search error:", error)
      const errorMessage: Message = {
        type: "bot",
        content: "Une erreur s'est produite lors de la recherche. Veuillez réessayer.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getHealthStatusColor = () => {
    switch (healthStatus) {
      case "ready":
        return "bg-green-500"
      case "loading":
        return "bg-yellow-500"
      case "offline":
        return "bg-red-500"
    }
  }

  const getHealthStatusText = () => {
    switch (healthStatus) {
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
      {/* Chat Icon Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center group"
          aria-label="Ouvrir le chat"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm">Assistant de Recherche</h3>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`h-2 w-2 rounded-full ${getHealthStatusColor()}`} />
                  <span>{getHealthStatusText()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-indigo-700 rounded-full p-1 transition-colors"
              aria-label="Fermer le chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message, index) => (
              <div key={index} className="space-y-2">
                {message.type === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ) : message.type === "bot" ? (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg px-4 py-2 max-w-[80%] shadow-sm">
                      <p className="text-sm text-gray-800">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg px-4 py-2 max-w-[80%] shadow-sm">
                        <p className="text-sm text-gray-800">{message.content}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {message.results?.map((result, idx) => (
                        <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
                          <CardContent className="p-0">
                            <div className="flex gap-3 p-3">
                              <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded overflow-hidden">
                                <img
                                  src={`${API_BASE_URL}${result.image_url}`}
                                  alt={result.nom}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = "/placeholder.svg"
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-gray-900 truncate">{result.nom}</h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {result.artiste} • {result.annee}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-indigo-600 font-medium">
                                    {(result.similarity * 100).toFixed(1)}% de similarité
                                  </span>
                                  {result.lien_site && (
                                    <a
                                      href={result.lien_site}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                    >
                                      Voir <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    <span className="text-sm text-gray-600">Recherche en cours...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Décrivez l'objet recherché..."
                className="flex-1"
                disabled={isLoading || healthStatus === "offline"}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || healthStatus === "offline"}
                className="bg-indigo-600 hover:bg-indigo-700"
                size="icon"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
