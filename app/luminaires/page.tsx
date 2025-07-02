"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Filter, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { SortSelector } from "@/components/SortSelector"
import { RangeSlider } from "@/components/RangeSlider"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { CSVExportButton } from "@/components/CSVExportButton"
import { useAuth } from "@/contexts/AuthContext"
import { RoleGuard } from "@/components/RoleGuard"

interface Luminaire {
  _id: string
  nom?: string
  "Nom de l'objet"?: string
  designer?: string
  "Artiste / Dates"?: string
  annee?: number
  year?: number
  Année?: number
  description?: string
  "Description / Commentaire"?: string
  dimensions?: string
  "Dimensions (H x L x P en cm)"?: string
  materiaux?: string
  Matériaux?: string
  couleur?: string
  "Couleur dominante"?: string
  style?: string
  "Style / Mouvement"?: string
  prix?: number
  "Prix (estimation en €)"?: number
  images?: string[]
  isFavorite?: boolean
  createdAt?: string
  updatedAt?: string
}

export default function LuminairesPage() {
  const searchParams = useSearchParams()
  const { userData } = useAuth()
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [filteredLuminaires, setFilteredLuminaires] = useState<Luminaire[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedStyle, setSelectedStyle] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [sortBy, setSortBy] = useState("nom")
  const [yearRange, setYearRange] = useState([1800, 2024])
  const [sliderModified, setSliderModified] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 24

  // Options pour les filtres
  const [designers, setDesigners] = useState<string[]>([])
  const [styles, setStyles] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])

  const isAdmin = userData?.role === "admin"

  useEffect(() => {
    const searchQuery = searchParams.get("search")
    if (searchQuery) {
      setSearchTerm(searchQuery)
    }
  }, [searchParams])

  useEffect(() => {
    loadLuminaires()
  }, [currentPage, searchTerm, selectedDesigner, selectedStyle, selectedColor, sortBy, yearRange, sliderModified])

  const loadLuminaires = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort: sortBy,
      })

      if (searchTerm) params.append("search", searchTerm)
      if (selectedDesigner) params.append("designer", selectedDesigner)
      if (selectedStyle) params.append("style", selectedStyle)
      if (selectedColor) params.append("color", selectedColor)

      // Ne filtrer par année que si le slider a été modifié
      if (sliderModified) {
        params.append("yearMin", yearRange[0].toString())
        params.append("yearMax", yearRange[1].toString())
      }

      const response = await fetch(`/api/luminaires?${params}`)
      const data = await response.json()

      if (data.success) {
        setLuminaires(data.luminaires)
        setFilteredLuminaires(data.luminaires)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)

        // Charger les options de filtres
        if (data.filters) {
          setDesigners(data.filters.designers || [])
          setStyles(data.filters.styles || [])
          setColors(data.filters.colors || [])
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des luminaires:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleYearRangeChange = (newRange: number[]) => {
    setYearRange(newRange)
    setSliderModified(true)
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedDesigner("")
    setSelectedStyle("")
    setSelectedColor("")
    setYearRange([1800, 2024])
    setSliderModified(false)
    setCurrentPage(1)
  }

  const handleLuminaireAdded = () => {
    loadLuminaires()
    setShowAddModal(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar des filtres */}
        <div className="lg:w-80 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Filtres</h2>
            </div>

            <div className="space-y-4">
              <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />

              <DropdownFilter
                label="Designer"
                value={selectedDesigner}
                onChange={setSelectedDesigner}
                options={designers}
                placeholder="Tous les designers"
              />

              <DropdownFilter
                label="Style"
                value={selectedStyle}
                onChange={setSelectedStyle}
                options={styles}
                placeholder="Tous les styles"
              />

              <DropdownFilter
                label="Couleur"
                value={selectedColor}
                onChange={setSelectedColor}
                options={colors}
                placeholder="Toutes les couleurs"
              />

              <div>
                <label className="block text-sm font-medium mb-2">Période</label>
                <RangeSlider
                  min={1800}
                  max={2024}
                  value={yearRange}
                  onChange={handleYearRangeChange}
                  formatLabel={(value) => value.toString()}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{yearRange[0]}</span>
                  <span>{yearRange[1]}</span>
                </div>
              </div>

              <Button onClick={resetFilters} variant="outline" className="w-full bg-transparent">
                Réinitialiser les filtres
              </Button>
            </div>
          </div>

          <RoleGuard allowedRoles={["admin"]}>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Actions Admin</h3>
              <div className="space-y-3">
                <Button onClick={() => setShowAddModal(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un luminaire
                </Button>
                <CSVExportButton />
              </div>
            </div>
          </RoleGuard>
        </div>

        {/* Contenu principal */}
        <div className="flex-1">
          {/* Header avec tri et statistiques */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Luminaires</h1>
              <p className="text-gray-600 mt-1">
                {totalCount} luminaire{totalCount > 1 ? "s" : ""} trouvé{totalCount > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <SortSelector value={sortBy} onChange={setSortBy} />
            </div>
          </div>

          {/* Filtres actifs */}
          {(searchTerm || selectedDesigner || selectedStyle || selectedColor || sliderModified) && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    {searchTerm}
                  </Badge>
                )}
                {selectedDesigner && <Badge variant="secondary">Designer: {selectedDesigner}</Badge>}
                {selectedStyle && <Badge variant="secondary">Style: {selectedStyle}</Badge>}
                {selectedColor && <Badge variant="secondary">Couleur: {selectedColor}</Badge>}
                {sliderModified && (
                  <Badge variant="secondary">
                    Période: {yearRange[0]} - {yearRange[1]}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Grille des luminaires */}
          <GalleryGrid
            luminaires={filteredLuminaires}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Modal d'ajout */}
      {showAddModal && (
        <LuminaireFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleLuminaireAdded}
        />
      )}
    </div>
  )
}
