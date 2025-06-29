"use client"

import { useState, useEffect, useCallback } from "react"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, User } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Designer {
  nom: string
  count: number
  imagedesigner?: string
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<Designer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("nom")
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const ITEMS_PER_PAGE = 20

  // Charger les designers avec pagination
  const loadDesigners = useCallback(async (pageNum = 1, reset = false) => {
    if (pageNum === 1) {
      setIsLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const response = await fetch(`/api/designers-data?page=${pageNum}&limit=${ITEMS_PER_PAGE}`)
      const data = await response.json()

      if (data.success) {
        const newDesigners = data.designers || []

        if (reset || pageNum === 1) {
          setDesigners(newDesigners)
          setFilteredDesigners(newDesigners)
        } else {
          setDesigners((prev) => [...prev, ...newDesigners])
          setFilteredDesigners((prev) => [...prev, ...newDesigners])
        }

        setHasMore(newDesigners.length === ITEMS_PER_PAGE)
        console.log(`📊 Page ${pageNum}: ${newDesigners.length} designers chargés`)
      }
    } catch (error) {
      console.error("❌ Erreur chargement designers:", error)
    } finally {
      setIsLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Charger plus de designers
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadDesigners(nextPage, false)
    }
  }, [page, loadingMore, hasMore, loadDesigners])

  // Scroll infini
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMore()
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loadMore])

  // Chargement initial
  useEffect(() => {
    loadDesigners(1, true)
  }, [loadDesigners])

  // Filtrage et tri
  useEffect(() => {
    const filtered = designers.filter((designer) => designer.nom.toLowerCase().includes(searchTerm.toLowerCase()))

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "nom":
          return a.nom.localeCompare(b.nom)
        case "count":
          return b.count - a.count
        default:
          return 0
      }
    })

    setFilteredDesigners(filtered)
  }, [designers, searchTerm, sortBy])

  const sortOptions = [
    { value: "nom", label: "Nom (A-Z)" },
    { value: "count", label: "Nombre de luminaires" },
  ]

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-amber-600 mb-4" />
            <p className="text-gray-600">Chargement des designers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif text-gray-900 mb-4">Designers & Artistes</h1>
          <p className="text-gray-600 text-lg">
            Découvrez les créateurs de notre collection de {designers.length} designers
          </p>
        </div>

        {/* Contrôles */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />
          </div>
          <div className="md:w-64">
            <SortSelector value={sortBy} onChange={setSortBy} options={sortOptions} />
          </div>
        </div>

        {/* Grille des designers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDesigners.map((designer) => {
            const designerSlug = encodeURIComponent(designer.nom)

            return (
              <Link key={designer.nom} href={`/designers/${designerSlug}`}>
                <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    {/* Image du designer */}
                    <div className="w-24 h-24 mx-auto mb-4 relative">
                      <div className="w-full h-full flex items-center justify-center bg-amber-50 rounded-full border-2 border-amber-200 overflow-hidden group-hover:border-amber-400 transition-colors">
                        {designer.imagedesigner ? (
                          <Image
                            src={`/api/images/filename/${designer.imagedesigner}`}
                            alt={designer.nom}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                              e.currentTarget.nextElementSibling?.classList.remove("hidden")
                            }}
                          />
                        ) : null}

                        <div className={`text-center ${designer.imagedesigner ? "hidden" : ""}`}>
                          <User className="w-8 h-8 text-amber-600 mx-auto mb-1" />
                          <span className="text-xs text-amber-600">Designer</span>
                        </div>
                      </div>
                    </div>

                    {/* Nom du designer */}
                    <h3 className="text-lg font-serif text-gray-900 text-center mb-3 group-hover:text-amber-700 transition-colors line-clamp-2">
                      {designer.nom}
                    </h3>

                    {/* Badge nombre de luminaires */}
                    <div className="text-center">
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-800 group-hover:bg-amber-200 transition-colors"
                      >
                        {designer.count} luminaire{designer.count > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Indicateur de chargement */}
        {loadingMore && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-600 mb-2" />
            <p className="text-gray-600">Chargement de plus de designers...</p>
          </div>
        )}

        {/* Message fin de liste */}
        {!hasMore && filteredDesigners.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Tous les designers ont été chargés</p>
          </div>
        )}

        {/* Message aucun résultat */}
        {filteredDesigners.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Aucun designer trouvé</h3>
            <p className="text-gray-600">
              {searchTerm ? `Aucun résultat pour "${searchTerm}"` : "Aucun designer disponible"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
