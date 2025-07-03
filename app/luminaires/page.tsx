"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { SortSelector } from "@/components/SortSelector"
import { RangeSlider } from "@/components/RangeSlider"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { RoleGuard } from "@/components/RoleGuard"
import { Button } from "@/components/ui/button"
import { Plus, Grid, List } from "lucide-react"

interface Luminaire {
  _id: string
  id: string
  nom: string
  name: string
  designer: string
  artist: string
  annee: number | null
  year: number | null
  periode: string
  specialty: string
  description: string
  collaboration: string
  signe: string
  signed: string
  dimensions: string
  materiaux: string[]
  couleurs: string[]
  estimation: string
  editeur: string
  filename: string
  image: string | null
  designerImage: string | null
  images: string[]
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

interface Filters {
  designers: string[]
  periodes: string[]
  materiaux: string[]
  couleurs: string[]
}

export default function LuminairesPage() {
  const searchParams = useSearchParams()
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [filters, setFilters] = useState<Filters>({
    designers: [],
    periodes: [],
    materiaux: [],
    couleurs: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // États des filtres
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriode, setSelectedPeriode] = useState("")
  const [selectedMateriaux, setSelectedMateriaux] = useState("")
  const [selectedCouleurs, setSelectedCouleurs] = useState("")
  const [sortField, setSortField] = useState("nom")
  const [sortDirection, setSortDirection] = useState("asc")
  const [yearRange, setYearRange] = useState([1900, 2024])
  const [sliderModified, setSliderModified] = useState(false)

  // États UI
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchLuminaires = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: "50",
          search: searchTerm,
          designer: selectedDesigner,
          periode: selectedPeriode,
          materiaux: selectedMateriaux,
          couleurs: selectedCouleurs,
          sortField,
          sortDirection,
        })

        if (sliderModified) {
          params.append("yearMin", yearRange[0].toString())
          params.append("yearMax", yearRange[1].toString())
        }

        const response = await fetch(`/api/luminaires?${params}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Erreur lors du chargement")
        }

        if (data.success) {
          const newLuminaires = Array.isArray(data.luminaires) ? data.luminaires : []

          if (append && pageNum > 1) {
            setLuminaires((prev) => [...prev, ...newLuminaires])
          } else {
            setLuminaires(newLuminaires)
          }

          setFilters(data.filters || { designers: [], periodes: [], materiaux: [], couleurs: [] })
          setHasMore(data.pagination?.hasMore || false)
          setTotal(data.pagination?.total || 0)
          setPage(pageNum)
        } else {
          throw new Error(data.error || "Erreur inconnue")
        }
      } catch (err: any) {
        console.error("❌ Erreur fetch luminaires:", err)
        setError(err.message)
        setLuminaires([])
      } finally {
        setLoading(false)
      }
    },
    [
      searchTerm,
      selectedDesigner,
      selectedPeriode,
      selectedMateriaux,
      selectedCouleurs,
      sortField,
      sortDirection,
      yearRange,
      sliderModified,
    ],
  )

  // Chargement initial et lors des changements de filtres
  useEffect(() => {
    fetchLuminaires(1, false)
  }, [fetchLuminaires])

  // Gestion du scroll infini
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchLuminaires(page + 1, true)
    }
  }, [hasMore, loading, page, fetchLuminaires])

  // Gestion des changements de filtres
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setPage(1)
  }

  const handleDesignerChange = (value: string) => {
    setSelectedDesigner(value)
    setPage(1)
  }

  const handlePeriodeChange = (value: string) => {
    setSelectedPeriode(value)
    setPage(1)
  }

  const handleMateriauxChange = (value: string) => {
    setSelectedMateriaux(value)
    setPage(1)
  }

  const handleCouleursChange = (value: string) => {
    setSelectedCouleurs(value)
    setPage(1)
  }

  const handleSortChange = (field: string, direction: string) => {
    setSortField(field)
    setSortDirection(direction)
    setPage(1)
  }

  const handleYearRangeChange = (range: number[]) => {
    setYearRange(range)
    setSliderModified(true)
    setPage(1)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedDesigner("")
    setSelectedPeriode("")
    setSelectedMateriaux("")
    setSelectedCouleurs("")
    setSortField("nom")
    setSortDirection("asc")
    setYearRange([1900, 2024])
    setSliderModified(false)
    setPage(1)
  }

  const handleLuminaireCreated = () => {
    setShowCreateModal(false)
    fetchLuminaires(1, false)
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur: {error}</p>
          <Button onClick={() => fetchLuminaires(1, false)}>Réessayer</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar des filtres */}
        <div className="lg:w-80 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-gray-900">Filtres</h2>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
            </div>

            <div className="space-y-4">
              <SearchBar value={searchTerm} onChange={handleSearchChange} placeholder="Rechercher..." />

              <DropdownFilter
                label="Designer"
                value={selectedDesigner}
                onChange={handleDesignerChange}
                options={filters.designers}
                placeholder="Tous les designers"
              />

              <DropdownFilter
                label="Période"
                value={selectedPeriode}
                onChange={handlePeriodeChange}
                options={filters.periodes}
                placeholder="Toutes les périodes"
              />

              <DropdownFilter
                label="Matériaux"
                value={selectedMateriaux}
                onChange={handleMateriauxChange}
                options={filters.materiaux}
                placeholder="Tous les matériaux"
              />

              <DropdownFilter
                label="Couleurs"
                value={selectedCouleurs}
                onChange={handleCouleursChange}
                options={filters.couleurs}
                placeholder="Toutes les couleurs"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chronologie</label>
                <RangeSlider
                  min={1900}
                  max={2024}
                  value={yearRange}
                  onChange={handleYearRangeChange}
                  formatLabel={(value) => value.toString()}
                />
              </div>
            </div>
          </div>

          <RoleGuard allowedRoles={["admin"]}>
            <Button onClick={() => setShowCreateModal(true)} className="w-full" size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un luminaire
            </Button>
          </RoleGuard>
        </div>

        {/* Contenu principal */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-lg">
            {/* Header avec contrôles */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-serif text-gray-900">Luminaires</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {loading
                      ? "Chargement..."
                      : `${total} luminaire${total !== 1 ? "s" : ""} trouvé${total !== 1 ? "s" : ""}`}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <SortSelector
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onChange={handleSortChange}
                    options={[
                      { value: "nom", label: "Nom" },
                      { value: "designer", label: "Designer" },
                      { value: "annee", label: "Année" },
                    ]}
                  />

                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className="rounded-r-none"
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="rounded-l-none"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Grille des luminaires */}
            <div className="p-6">
              {Array.isArray(luminaires) && luminaires.length > 0 ? (
                <GalleryGrid
                  items={luminaires}
                  viewMode={viewMode}
                  loading={loading}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                />
              ) : loading ? (
                <div className="text-center py-12">
                  <p>Chargement des luminaires...</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Aucun luminaire trouvé avec ces critères.</p>
                  <Button onClick={resetFilters} className="mt-4">
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de création */}
      {showCreateModal && (
        <LuminaireFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleLuminaireCreated}
        />
      )}
    </div>
  )
}
