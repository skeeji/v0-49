"use client"

import { useState, useEffect, useCallback } from "react"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/useToast"
import Link from "next/link"
import Image from "next/image"

interface Designer {
  nom: string
  imagedesigner?: string
  totalLuminaires: number
  firstLuminaireImage?: string
}

// Fonction pour créer un slug à partir du nom du designer
function createDesignerSlug(name: string): string {
  if (!name || typeof name !== "string") return ""
  return name.trim()
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("nom")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { userData } = useAuth()
  const { showToast } = useToast()

  const ITEMS_PER_PAGE = 20

  // Fonction pour récupérer les designers
  const fetchDesigners = useCallback(async () => {
    try {
      console.log("🔍 Chargement des designers...")
      const response = await fetch("/api/designers")
      const data = await response.json()

      console.log("📊 Réponse API designers:", data)

      if (data.success) {
        // Filtrer les designers valides et créer les objets Designer
        const validDesigners = data.designers
          .filter((designer: any) => designer && designer.nom && typeof designer.nom === "string")
          .map((designer: any) => ({
            nom: designer.nom.trim(),
            imagedesigner: designer.imagedesigner || null,
            totalLuminaires: designer.totalLuminaires || 0,
            firstLuminaireImage: designer.firstLuminaireImage || null,
          }))

        setDesigners(validDesigners)
        setFilteredDesigners(validDesigners)
      } else {
        showToast("Erreur lors du chargement des designers", "error")
      }
    } catch (error) {
      console.error("❌ Erreur chargement designers:", error)
      showToast("Erreur lors du chargement des designers", "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // Charger les designers au montage
  useEffect(() => {
    fetchDesigners()
  }, [fetchDesigners])

  // Filtrer et trier les designers
  useEffect(() => {
    const filtered = designers.filter((designer) => designer.nom.toLowerCase().includes(searchTerm.toLowerCase()))

    // Trier
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "nom":
          return a.nom.localeCompare(b.nom)
        case "luminaires":
          return b.totalLuminaires - a.totalLuminaires
        default:
          return 0
      }
    })

    setFilteredDesigners(filtered)
    setCurrentPage(1)
    setHasMore(filtered.length > ITEMS_PER_PAGE)
  }, [designers, searchTerm, sortBy])

  // Pagination infinie
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1
      const maxPage = Math.ceil(filteredDesigners.length / ITEMS_PER_PAGE)

      if (nextPage <= maxPage) {
        setCurrentPage(nextPage)
        setHasMore(nextPage < maxPage)
      } else {
        setHasMore(false)
      }
    }
  }, [currentPage, filteredDesigners.length, hasMore, loading])

  // Écouter le scroll pour la pagination infinie
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMore()
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loadMore])

  // Calculer les designers à afficher
  const displayedDesigners = filteredDesigners.slice(0, currentPage * ITEMS_PER_PAGE)

  const sortOptions = [
    { value: "nom", label: "Nom" },
    { value: "luminaires", label: "Nombre de luminaires" },
  ]

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-playfair font-bold text-dark">Designers</h1>
          <p className="text-gray-600">Découvrez {designers.length} designers et leurs créations lumineuses</p>
        </div>

        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Rechercher un designer..."
              className="flex-1"
            />
          </div>
          <div className="flex gap-4">
            <SortSelector value={sortBy} onChange={setSortBy} options={sortOptions} />
          </div>
        </div>

        {/* Résultats */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {filteredDesigners.length} designer{filteredDesigners.length > 1 ? "s" : ""} trouvé
            {filteredDesigners.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Grille des designers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {displayedDesigners.map((designer, index) => (
            <Link
              key={`${designer.nom}-${index}`}
              href={`/designers/${createDesignerSlug(designer.nom)}`}
              className="group block"
            >
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="aspect-square relative bg-gray-100">
                  <Image
                    src={
                      designer.imagedesigner
                        ? `/api/images/filename/${designer.imagedesigner}`
                        : designer.firstLuminaireImage || "/placeholder.svg"
                    }
                    alt={designer.nom}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg"
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-dark group-hover:text-orange transition-colors duration-300 line-clamp-2">
                    {designer.nom}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {designer.totalLuminaires} luminaire{designer.totalLuminaires > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Indicateur de chargement */}
        {hasMore && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
          </div>
        )}

        {/* Message si aucun résultat */}
        {filteredDesigners.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun designer trouvé pour votre recherche.</p>
          </div>
        )}
      </div>
    </div>
  )
}
