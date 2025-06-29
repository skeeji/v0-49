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
  imagedesigner?: string
  slug: string
}

export default function DesignersPage() {
  const [allDesigners, setAllDesigners] = useState<Designer[]>([])
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

  // Charger tous les designers
  useEffect(() => {
    async function fetchDesigners() {
      setIsLoading(true)
      try {
        console.log("👨‍🎨 Chargement des designers...")
        const response = await fetch("/api/designers-data")
        const data = await response.json()

        if (data.success && data.designers) {
          console.log(`✅ ${data.designers.length} designers chargés`)
          setAllDesigners(data.designers)
          setFilteredDesigners(data.designers)
        } else {
          console.error("❌ Erreur chargement designers:", data.error)
        }
      } catch (error) {
        console.error("❌ Erreur critique chargement designers:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDesigners()
  }, [])

  // Filtrer par recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDesigners(allDesigners)
    } else {
      const filtered = allDesigners.filter((designer) => designer.nom.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredDesigners(filtered)
    }
    // Reset pagination
    setPage(0)
    setDisplayedDesigners([])
    setHasMore(true)
  }, [searchTerm, allDesigners])

  // Charger plus d'éléments
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    // Simuler un délai pour l'UX
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

      console.log(`📄 Page ${page + 1} chargée: ${newItems.length} designers`)
    }, 300)
  }, [page, filteredDesigners, isLoadingMore, hasMore])

  // Charger plus quand on arrive en bas
  useEffect(() => {
    if (inView && !isLoadingMore && hasMore && filteredDesigners.length > 0) {
      loadMore()
    }
  }, [inView, loadMore, isLoadingMore, hasMore, filteredDesigners.length])

  // Charger la première page quand les données changent
  useEffect(() => {
    if (filteredDesigners.length > 0 && displayedDesigners.length === 0 && !isLoadingMore) {
      loadMore()
    }
  }, [filteredDesigners, displayedDesigners.length, isLoadingMore, loadMore])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-orange-500 mb-4" />
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
          <p className="text-lg text-gray-600 mb-6">Découvrez les créateurs derrière nos luminaires d'exception</p>

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
              <span>{allDesigners.reduce((sum, d) => sum + d.count, 0)} œuvres</span>
            </div>
          </div>
        </div>

        {/* Grille des designers */}
        {filteredDesigners.length === 0 ? (
          <div className="text-center py-16">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600">
              {searchTerm ? "Aucun designer trouvé pour cette recherche" : "Aucun designer disponible"}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-2 text-orange-600 hover:text-orange-700 underline"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayedDesigners.map((designer, index) => (
                <Link key={`${designer.slug}-${index}`} href={`/designers/${encodeURIComponent(designer.nom)}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className="text-center">
                        {/* Image du designer */}
                        <div className="w-20 h-20 mx-auto mb-4 relative">
                          <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 group-hover:border-orange-300 transition-colors">
                            {designer.imagedesigner ? (
                              <Image
                                src={`/api/images/filename/${designer.imagedesigner}`}
                                alt={designer.nom}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  console.log("❌ Erreur image designer:", designer.imagedesigner)
                                  const target = e.target as HTMLImageElement
                                  target.style.display = "none"
                                  const parent = target.parentElement
                                  if (parent) {
                                    const fallback = parent.querySelector(".fallback-icon") as HTMLElement
                                    if (fallback) fallback.style.display = "flex"
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className={`fallback-icon w-full h-full flex items-center justify-center ${designer.imagedesigner ? "hidden" : ""}`}
                            >
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                          </div>
                        </div>

                        {/* Nom du designer */}
                        <h3 className="font-serif text-lg text-gray-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-2">
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
                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    <span className="text-gray-600">Chargement...</span>
                  </div>
                )}
              </div>
            )}

            {!hasMore && displayedDesigners.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Tous les designers ont été chargés ({displayedDesigners.length} au total)</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
