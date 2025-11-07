"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Upload, Send, ImageIcon, Loader2, Clock, Trash2 } from "lucide-react"
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
  nom?: string
  artiste?: string
  designer?: string
  annee?: string | number
  similarity?: number
  lien_site?: string
}

interface SavedSearch {
  id: string
  query: string
  timestamp: Date
  type: "text" | "image"
  resultsCount: number
}

export default function RecherchePage() {
  const { user, userData, incrementSearchCount } = useAuth()
  const [inputValue, setInputValue] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showHistory, setShowHistory] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Charger l'historique des recherches depuis localStorage
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`searchHistory_${user.uid}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setSavedSearches(
          parsed.map((s: any) => ({
            ...s,
            timestamp: new Date(s.timestamp),
          })),
        )
      }
    }
  }, [user])

  // Sauvegarder une recherche
  const saveSearch = (query: string, type: "text" | "image", resultsCount: number) => {
    if (!user) return

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      query,
      timestamp: new Date(),
      type,
      resultsCount,
    }

    const updated = [newSearch, ...savedSearches].slice(0, 20) // Garder les 20 dernières
    setSavedSearches(updated)
    localStorage.setItem(`searchHistory_${user.uid}`, JSON.stringify(updated))
  }

  // Supprimer une recherche de l'historique
  const deleteSearch = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id)
    setSavedSearches(updated)
    if (user) {
      localStorage.setItem(`searchHistory_${user.uid}`, JSON.stringify(updated))
    }
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

    setIsSearching(true)
    setSearchResults([])

    try {
      const response = await fetch(`${API_BASE_URL_TEXT}/api/search_text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: inputValue,
          top_k: 5,
        }),
      })

      if (!response.ok) throw new Error("Erreur lors de la recherche")

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        // Nettoyer les NaN
        data = JSON.parse(text.replace(/:\s*NaN/g, ": null"))
      }

      if (data.results && data.results.length > 0) {
        // Enrichir avec les IDs
        const enrichedResults = await enrichResultsWithIds(data.results)
        setSearchResults(enrichedResults)
        saveSearch(inputValue, "text", enrichedResults.length)
        toast.success(`${enrichedResults.length} luminaire(s) trouvé(s)`)
      } else {
        toast.info("Aucun résultat trouvé")
      }
    } catch (error) {
      console.error("Search error:", error)
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

    setIsSearching(true)
    setSearchResults([])

    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("top_k", "5")

      const response = await fetch(`${API_BASE_URL_IMAGE}/api/search`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Erreur lors de la recherche par image")

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const enrichedResults = await enrichImageResultsWithIds(data.results)
        setSearchResults(enrichedResults)
        saveSearch(file.name, "image", enrichedResults.length)
        toast.success(`${enrichedResults.length} luminaire(s) similaire(s) trouvé(s)`)
      } else {
        toast.info("Aucun résultat trouvé")
      }
    } catch (error) {
      console.error("Image search error:", error)
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

  const loadHistorySearch = (search: SavedSearch) => {
    if (search.type === "text") {
      setInputValue(search.query)
      setSelectedImage(null)
      setImagePreview(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar historique */}
        <div
          className={`${
            showHistory ? "w-80" : "w-0"
          } transition-all duration-300 bg-white border-r border-slate-200 overflow-hidden flex flex-col`}
        >
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Historique
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {!user ? (
              <div className="text-center text-slate-500 text-sm mt-8 px-4">
                Connectez-vous pour sauvegarder votre historique
              </div>
            ) : savedSearches.length === 0 ? (
              <div className="text-center text-slate-500 text-sm mt-8 px-4">Aucune recherche enregistrée</div>
            ) : (
              <div className="space-y-2">
                {savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="p-3 rounded-lg hover:bg-slate-100 cursor-pointer group transition-colors relative"
                    onClick={() => loadHistorySearch(search)}
                  >
                    <div className="flex items-start gap-2">
                      {search.type === "image" ? (
                        <ImageIcon className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                      ) : (
                        <span className="text-slate-400 text-sm mt-1">🔍</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate">{search.query}</p>
                        <p className="text-xs text-slate-500">
                          {search.resultsCount} résultat(s) •{" "}
                          {search.timestamp.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSearch(search.id)
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
          {/* En-tête avec titre */}
          <div className="p-6 bg-white border-b border-slate-200">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-serif text-slate-800 mb-2" style={{ color: "#f2d895" }}>
                Recherche de Luminaires
              </h1>
              <p className="text-slate-600">Recherchez par texte ou par image dans notre collection</p>
            </div>
          </div>

          {/* Zone de résultats scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6">
              {/* Message d'accueil */}
              {searchResults.length === 0 && !isSearching && (
                <div className="text-center mt-20">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10" style={{ color: "#f2d895" }} />
                  </div>
                  <h2 className="text-2xl font-serif text-slate-800 mb-3">Comment puis-je vous aider ?</h2>
                  <p className="text-slate-600 mb-8">
                    Décrivez le luminaire que vous recherchez ou téléversez une image
                  </p>

                  {/* Suggestions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    <button
                      onClick={() => setInputValue("Lustre art déco en bronze")}
                      className="p-4 text-left rounded-xl border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all"
                    >
                      <p className="text-sm font-medium text-slate-800">Lustre art déco en bronze</p>
                      <p className="text-xs text-slate-500 mt-1">Recherche par style et matériau</p>
                    </button>
                    <button
                      onClick={() => setInputValue("Lampe années 30 en laiton")}
                      className="p-4 text-left rounded-xl border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all"
                    >
                      <p className="text-sm font-medium text-slate-800">Lampe années 30 en laiton</p>
                      <p className="text-xs text-slate-500 mt-1">Recherche par époque</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Recherche en cours */}
              {isSearching && (
                <div className="text-center mt-20">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: "#f2d895" }} />
                  <p className="text-lg text-slate-700">Recherche en cours...</p>
                  <p className="text-sm text-slate-500 mt-2">Analyse de notre collection</p>
                </div>
              )}

              {/* Résultats */}
              {searchResults.length > 0 && !isSearching && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-slate-800">{searchResults.length} résultat(s) trouvé(s)</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.map((result, index) => (
                      <Card
                        key={index}
                        className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
                      >
                        {result.luminaireUrl ? (
                          <Link href={result.luminaireUrl}>
                            <div className="relative h-64 bg-slate-100">
                              <Image
                                src={result.imageUrl || "/placeholder.svg"}
                                alt={result.nom || result.imageId || "Luminaire"}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="p-4">
                              <h4 className="font-semibold text-slate-900 mb-1 line-clamp-2">
                                {result.nom || result.imageId || "Luminaire"}
                              </h4>
                              {result.artiste && (
                                <p className="text-sm text-slate-600">
                                  {result.artiste}
                                  {result.annee && ` • ${result.annee}`}
                                </p>
                              )}
                              {result.similarity && (
                                <p className="text-sm font-medium mt-2" style={{ color: "#c4a363" }}>
                                  {Math.round(result.similarity * 100)}% de similarité
                                </p>
                              )}
                            </div>
                          </Link>
                        ) : (
                          <>
                            <div className="relative h-64 bg-slate-100">
                              <Image
                                src={result.imageUrl || "/placeholder.svg"}
                                alt={result.nom || result.imageId || "Luminaire"}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="p-4">
                              <h4 className="font-semibold text-slate-900 mb-1 line-clamp-2">
                                {result.nom || result.imageId || "Luminaire"}
                              </h4>
                              {result.similarity && (
                                <p className="text-sm font-medium mt-2" style={{ color: "#c4a363" }}>
                                  {Math.round(result.similarity * 100)}% de similarité
                                </p>
                              )}
                              <p className="text-xs text-slate-500 mt-2">Fiche détaillée non disponible</p>
                            </div>
                          </>
                        )}
                      </Card>
                    ))}
                  </div>
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
                    placeholder="Décrivez le luminaire recherché..."
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
