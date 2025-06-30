"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import { SearchBar } from "@/components/SearchBar"
import { Button } from "@/components/ui/button"
import { Grid, List, Loader2 } from "lucide-react"
import { CSVExportButton } from "@/components/CSVExportButton"
import Link from "next/link"
import Image from "next/image"

export default function DesignersPage() {
  const [designers, setDesigners] = useState<any[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<any[]>([])
  const [displayedDesigners, setDisplayedDesigners] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const ITEMS_PER_PAGE = 50

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  })

  // Charger les designers
  useEffect(() => {
    async function fetchDesigners() {
      setIsLoading(true)
      try {
        const response = await fetch("/api/designers")
        const data = await response.json()

        if (data.success) {
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

  // Filtrer les designers
  useEffect(() => {
    let filtered = [...designers]

    if (searchTerm) {
      filtered = filtered.filter((designer) => designer.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Trier par nom
    filtered.sort((a, b) => a.nom.localeCompare(b.nom))

    setFilteredDesigners(filtered)
    setPage(0)
    setHasMore(true)
    setDisplayedDesigners([])
  }, [designers, searchTerm])

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
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-serif text-gray-900 mb-2">Designers ({filteredDesigners.length})</h1>
            <p className="text-gray-600">Collection de designers de luminaires</p>
          </div>

          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <CSVExportButton data={filteredDesigners} filename="designers" />

            <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")}>
                <Grid className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}>
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="max-w-md">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />
          </div>
        </div>

        {/* Grille des designers */}
        {displayedDesigners.length === 0 && !isLoading ? (
          <div className="text-center py-16">
            <p className="text-lg text-gray-600">Aucun designer trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier votre recherche</p>
          </div>
        ) : (
          <>
            <div
              className={`grid gap-6 ${
                viewMode === "grid"
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                  : "grid-cols-1"
              }`}
            >
              {displayedDesigners.map((designer) => (
                <Link
                  key={designer._id}
                  href={`/designers/${encodeURIComponent(designer.nom)}`}
                  className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <div className="aspect-square relative overflow-hidden bg-gray-100">
                    {designer.imagedesigner ? (
                      <Image
                        src={`/api/images/filename/${designer.imagedesigner}`}
                        alt={designer.nom}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400 text-4xl font-serif">
                          {designer.nom.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-serif text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
                      {designer.nom}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {designer.luminairesCount || 0} luminaire{(designer.luminairesCount || 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
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
