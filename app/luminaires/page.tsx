"use client"

import { useState, useEffect, useMemo } from "react"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { GalleryGrid } from "@/components/GalleryGrid"
import { useAuth } from "@/contexts/AuthContext"
import type { Luminaire } from "@/lib/types"

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [filteredLuminaires, setFilteredLuminaires] = useState<Luminaire[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [yearRange, setYearRange] = useState<[number, number]>([1165, 2025])
  const { userData } = useAuth()

  // Charger les luminaires
  useEffect(() => {
    const fetchLuminaires = async () => {
      try {
        const response = await fetch("/api/luminaires")
        if (response.ok) {
          const data = await response.json()
          setLuminaires(data.luminaires || [])
        }
      } catch (error) {
        console.error("Erreur lors du chargement des luminaires:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLuminaires()
  }, [])

  // Filtrer et trier les luminaires
  const processedLuminaires = useMemo(() => {
    let filtered = luminaires

    // Filtrage par recherche (recherche dans tous les luminaires, pas de limite par le slider)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = luminaires.filter(
        (luminaire) =>
          luminaire.name?.toLowerCase().includes(searchLower) ||
          luminaire.designer?.toLowerCase().includes(searchLower) ||
          luminaire.description?.toLowerCase().includes(searchLower) ||
          luminaire.materials?.some((material) => material.toLowerCase().includes(searchLower)) ||
          luminaire.colors?.some((color) => color.toLowerCase().includes(searchLower)),
      )
    } else {
      // Filtrage par année seulement si pas de recherche
      filtered = luminaires.filter((luminaire) => {
        const year = luminaire.year || 0
        return year >= yearRange[0] && year <= yearRange[1]
      })
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "")
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "")
        case "designer-asc":
          return (a.designer || "").localeCompare(b.designer || "")
        case "designer-desc":
          return (b.designer || "").localeCompare(a.designer || "")
        case "year-asc":
          return (a.year || 0) - (b.year || 0)
        case "year-desc":
          return (b.year || 0) - (a.year || 0)
        default:
          return 0
      }
    })

    return filtered
  }, [luminaires, searchTerm, sortBy, yearRange])

  useEffect(() => {
    setFilteredLuminaires(processedLuminaires)
  }, [processedLuminaires])

  const sortOptions = [
    { value: "name-asc", label: "Nom A-Z" },
    { value: "name-desc", label: "Nom Z-A" },
    { value: "designer-asc", label: "Designer A-Z" },
    { value: "designer-desc", label: "Designer Z-A" },
    { value: "year-asc", label: "Année croissante" },
    { value: "year-desc", label: "Année décroissante" },
  ]

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Chargement des luminaires...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6 font-serif">Luminaires</h1>

        {/* Filtres */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Rechercher dans tous les luminaires..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <DropdownFilter label="Trier par" value={sortBy} onValueChange={setSortBy} options={sortOptions} />
          </div>
        </div>

        {/* Slider d'années - masqué pendant la recherche */}
        {!searchTerm && (
          <div className="mb-6">
            <RangeSlider min={1165} max={2025} value={yearRange} onValueChange={setYearRange} label="Période" />
          </div>
        )}

        {/* Résultats */}
        <div className="mb-4">
          <p className="text-gray-600">
            {searchTerm
              ? `${filteredLuminaires.length} résultat(s) trouvé(s) pour "${searchTerm}"`
              : `${filteredLuminaires.length} luminaires (${yearRange[0]} - ${yearRange[1]})`}
          </p>
        </div>
      </div>

      {/* Grille des luminaires */}
      <GalleryGrid items={filteredLuminaires} type="luminaires" showFavorites={!!userData} userRole={userData?.role} />
    </div>
  )
}
