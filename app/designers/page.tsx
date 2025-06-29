"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SearchBar } from "@/components/SearchBar"
import { User, Palette, Loader2 } from "lucide-react"

interface Designer {
  nom: string
  count: number
  image?: string
  slug: string
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<Designer[]>([])
  const [displayedDesigners, setDisplayedDesigners] = useState<Designer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const ITEMS_PER_PAGE = 20

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  })

  // Charger les designers
  useEffect(() => {
    async function fetchDesigners() {
      setIsLoading(true)
      try {
        const response = await fetch("/api/designers-data")
        const data = await response.json()

        if (data.success && data.designers) {
          console.log(`👨‍🎨 ${data.designers.length} designers chargés`)
          setDesigners(data.designers)
          setFilteredDesigners(data.designers)
        }
      } catch (error) {
        console.error("❌ Erreur chargement designers:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDesigners()
  }, [])

  // Filtrer par recherche
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDesigners(designers)
    } else {
      const filtered = designers.filter((designer) => designer.nom.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredDesigners(filtered)
    }
    setPage(0)
    setHasMore(true)
  }, [searchTerm, designers])

  // Charger plus d'éléments
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    setTimeout(() => {
      const startIndex = page * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const newItems = filteredDesigners.slice(startIndex, endIndex)

      if (page === 0) {
        setDisplayedDesigners(newItems)
      } else {
        setDisplayedDesigners((prev) => [...prev, ...newItems])
      }

      setPage((prev) => prev + 1)
      setHasMore(endIndex < filteredDesigners.length)
      setIsLoadingMore(false)
    }, 300)
  }, [page, filteredDesigners, isLoadingMore, hasMore])

  // Charger plus quand on arrive en bas
  useEffect(() => {
    if (inView && !isLoadingMore && hasMore) {
      loadMore()
    }
  }, [inView, loadMore, isLoadingMore, hasMore])

  // Charger la première page
  useEffect(() => {
    if (filteredDesigners.length > 0 && displayedDesigners.length === 0) {
      loadMore()
    }
  }, [filteredDesigners, displayedDesigners.length, loadMore])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400 mb-4" />
          <p className="text-lg text-gray-600">Chargement des designers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif text-gray-900 mb-4">Designers & Artistes</h1>
          <p className="text-lg text-gray-600 mb-6">
            Découvrez les créateurs derrière nos {designers.length} luminaires d'exception
          </p>

          <div className="max-w-md mx-auto mb-6">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Rechercher un designer..."
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{filteredDesigners.length} designers</span>
            </div>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span>{designers.reduce((sum, d) => sum + d.count, 0)} œuvres</span>
            </div>
          </div>
        </div>

        {/* Grille des designers */}
        {displayedDesigners.length === 0 ? (
          <div className="text-center py-16">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600">Aucun designer trouvé</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayedDesigners.map((designer) => (
                <Link key={designer.slug} href={`/designers/${encodeURIComponent(designer.slug)}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className="text-center">
                        {/* Image du designer */}
                        <div className="w-20 h-20 mx-auto mb-4 relative">
                          <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 group-hover:border-orange-300 transition-colors">
                            {designer.image ? (
                              <Image
                                src={designer.image || "/placeholder.svg"}
                                alt={designer.nom}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = "none"
                                  target.nextElementSibling?.classList.remove("hidden")
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-full h-full flex items-center justify-center ${designer.image ? "hidden" : ""}`}
                            >
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                          </div>
                        </div>

                        {/* Nom du designer */}
                        <h3 className="font-serif text-lg text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                          {designer.nom}
                        </h3>

                        {/* Nombre de luminaires */}
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {designer.count} luminaire{designer.count > 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Indicateur de chargement */}
            {hasMore && (
              <div ref={ref} className="text-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-gray-600">Chargement...</span>
                  </div>
                )}
              </div>
            )}

            {!hasMore && displayedDesigners.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Tous les designers ont été chargés</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
