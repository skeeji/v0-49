"use client"

import { useState, useEffect } from "react"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { Users, Palette } from "lucide-react"

interface Designer {
  _id: string
  nom: string
  imagedesigner?: string
  slug: string
  luminairesCount: number
}

const ITEMS_PER_PAGE = 50

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<Designer[]>([])
  const [displayedDesigners, setDisplayedDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("nom")
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  })

  // Charger tous les designers
  useEffect(() => {
    const fetchDesigners = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/designers")
        const data = await response.json()

        if (data.success) {
          setDesigners(data.designers)
          setFilteredDesigners(data.designers)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des designers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDesigners()
  }, [])

  // Filtrer et trier les designers
  useEffect(() => {
    const filtered = designers.filter((designer) => designer.nom.toLowerCase().includes(searchTerm.toLowerCase()))

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "nom":
          return a.nom.localeCompare(b.nom)
        case "luminaires":
          return b.luminairesCount - a.luminairesCount
        default:
          return 0
      }
    })

    setFilteredDesigners(filtered)
    setPage(1)
    setHasMore(true)
  }, [designers, searchTerm, sortBy])

  // Gérer l'affichage paginé
  useEffect(() => {
    const startIndex = 0
    const endIndex = page * ITEMS_PER_PAGE
    const newDisplayed = filteredDesigners.slice(startIndex, endIndex)

    setDisplayedDesigners(newDisplayed)
    setHasMore(endIndex < filteredDesigners.length)
  }, [filteredDesigners, page])

  // Charger plus d'éléments quand on arrive en bas
  useEffect(() => {
    if (inView && hasMore && !loadingMore && !loading) {
      setLoadingMore(true)
      setTimeout(() => {
        setPage((prev) => prev + 1)
        setLoadingMore(false)
      }, 500)
    }
  }, [inView, hasMore, loadingMore, loading])

  const sortOptions = [
    { value: "nom", label: "Nom (A-Z)" },
    { value: "luminaires", label: "Nombre de luminaires" },
  ]

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Designers</h1>
          <p className="text-gray-600">Découvrez les créateurs de luminaires</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <Skeleton className="w-full h-48" />
                <div className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
          <Users className="w-10 h-10 text-blue-600" />
          Designers
        </h1>
        <p className="text-gray-600 text-lg">Découvrez {designers.length} créateurs de luminaires d'exception</p>
      </div>

      {/* Barre de recherche et tri */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />
        </div>
        <SortSelector value={sortBy} onChange={setSortBy} options={sortOptions} />
      </div>

      {/* Résultats */}
      <div className="mb-6">
        <p className="text-gray-600">
          {filteredDesigners.length} designer{filteredDesigners.length > 1 ? "s" : ""} trouvé
          {filteredDesigners.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Grille des designers */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {displayedDesigners.map((designer) => (
          <Link key={designer._id} href={`/designers/${encodeURIComponent(designer.slug)}`}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
              <CardContent className="p-0">
                {/* Image du designer */}
                <div className="relative w-full h-48 bg-gray-100">
                  {designer.imagedesigner ? (
                    <Image
                      src={`/api/images/filename/${encodeURIComponent(designer.imagedesigner)}`}
                      alt={designer.nom}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=200&width=200&text=Designer"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                      <Palette className="w-16 h-16 text-blue-400" />
                    </div>
                  )}
                </div>

                {/* Informations du designer */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {designer.nom}
                  </h3>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {designer.luminairesCount} luminaire{designer.luminairesCount > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Indicateur de chargement */}
      {loadingMore && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <Skeleton className="w-full h-48" />
                <div className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Élément de déclenchement pour le scroll infini */}
      {hasMore && !loadingMore && (
        <div ref={ref} className="h-10 flex items-center justify-center mt-8">
          <div className="text-gray-500">Chargement...</div>
        </div>
      )}

      {/* Message de fin */}
      {!hasMore && displayedDesigners.length > 0 && (
        <div className="text-center mt-8 py-8 text-gray-500">Tous les designers ont été chargés</div>
      )}

      {/* Message si aucun résultat */}
      {filteredDesigners.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Aucun designer trouvé</h3>
          <p className="text-gray-500">Essayez de modifier votre recherche ou vos filtres</p>
        </div>
      )}
    </div>
  )
}
