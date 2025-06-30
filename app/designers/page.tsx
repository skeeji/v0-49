"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import { SearchBar } from "@/components/SearchBar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, User } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Designer {
  _id: string
  nom: string
  imagedesigner?: string
  luminaires?: any[]
  totalLuminaires?: number
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [displayedDesigners, setDisplayedDesigners] = useState<Designer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false) // Declare the variable

  const ITEMS_PER_PAGE = 50

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  })

  // Charger tous les designers
  useEffect(() => {
    async function fetchDesigners() {
      setLoading(true)
      try {
        const response = await fetch("/api/designers")
        const data = await response.json()

        if (data.success) {
          console.log(`👨‍🎨 ${data.designers.length} designers chargés`)
          setDesigners(data.designers)
        }
      } catch (error) {
        console.error("❌ Erreur chargement designers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDesigners()
  }, [])

  // Filtrer les designers
  const filteredDesigners = designers.filter((designer) =>
    designer.nom.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Charger plus d'éléments
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    setIsLoadingMore(true) // Set the variable

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
      setLoadingMore(false)
      setIsLoadingMore(false) // Reset the variable
    }, 300)
  }, [page, filteredDesigners, loadingMore, hasMore])

  // Charger plus quand on arrive en bas
  useEffect(() => {
    if (inView && !loadingMore && hasMore) {
      loadMore()
    }
  }, [inView, loadMore, isLoadingMore, hasMore])

  // Reset quand la recherche change
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    setDisplayedDesigners([])
  }, [searchTerm])

  // Charger la première page
  useEffect(() => {
    if (filteredDesigners.length > 0 && displayedDesigners.length === 0) {
      loadMore()
    }
  }, [filteredDesigners, displayedDesigners.length, loadMore])

  if (loading) {
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif text-gray-900 mb-4">Designers ({filteredDesigners.length})</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Découvrez les créateurs emblématiques du design luminaire
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="max-w-md mx-auto mb-12">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />
        </div>

        {/* Grille des designers */}
        {displayedDesigners.length === 0 && !loading ? (
          <div className="text-center py-16">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-lg text-gray-600">Aucun designer trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier votre recherche</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {displayedDesigners.map((designer) => (
                <Link key={designer._id} href={`/designers/${encodeURIComponent(designer.nom)}`}>
                  <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-lg">
                    <CardContent className="p-0">
                      {/* Image du designer */}
                      <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
                        {designer.imagedesigner ? (
                          <Image
                            src={`/api/images/filename/${designer.imagedesigner}`}
                            alt={designer.nom}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <User className="w-16 h-16 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Informations du designer */}
                      <div className="p-6">
                        <h3 className="font-serif text-xl text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                          {designer.nom}
                        </h3>

                        {designer.totalLuminaires && (
                          <Badge variant="secondary" className="text-xs">
                            {designer.totalLuminaires} luminaire{designer.totalLuminaires > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Indicateur de chargement */}
            {hasMore && (
              <div ref={ref} className="text-center py-8">
                {loadingMore && (
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
