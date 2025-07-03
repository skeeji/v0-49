"use client"

import { useState, useEffect, useCallback } from "react"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { SortSelector } from "@/components/SortSelector"
import { GalleryGrid } from "@/components/GalleryGrid"
import { Button } from "@/components/ui/button"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { CSVExportButton } from "@/components/CSVExportButton"
import { useAuth } from "@/contexts/AuthContext"
import { Plus, Download } from "lucide-react"
import { toast } from "sonner"

interface Luminaire {
  _id: string
  id: string
  nom: string
  designer: string
  annee?: number
  periode?: string
  materiaux: string[]
  couleurs: string[]
  image?: string
  isFavorite: boolean
}

interface Filters {
  designers: string[]
  periodes: string[]
  materiaux: string[]
  couleurs: string[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [filters, setFilters] = useState<Filters>({
    designers: [],
    periodes: [],
    materiaux: [],
    couleurs: [],
  })
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // États des filtres
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriode, setSelectedPeriode] = useState("")
  const [selectedMateriaux, setSelectedMateriaux] = useState("")
  const [selectedCouleurs, setSelectedCouleurs] = useState("")
  const [yearRange, setYearRange] = useState([1900, 2024])
  const [sliderModified, setSliderModified] = useState(false)
  const [sortField, setSortField] = useState("nom")
  const [sortDirection, setSortDirection] = useState("asc")

  // Modal d'ajout
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const { userData, loading: authLoading } = useAuth()
  const canAdd = !authLoading && userData?.role === "admin"

  const fetchLuminaires = useCallback(
    async (page = 1) => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
          search: searchTerm,
          designer: selectedDesigner,
          periode: selectedPeriode,
          materiaux: selectedMateriaux,
          couleurs: selectedCouleurs,
          yearMin: yearRange[0].toString(),
          yearMax: yearRange[1].toString(),
          sliderModified: sliderModified.toString(),
          sortField,
          sortDirection,
        })

        const response = await fetch(`/api/luminaires?${params}`)
        const data = await response.json()

        if (data.success) {
          setLuminaires(data.luminaires || [])
          setFilters(data.filters || { designers: [], periodes: [], materiaux: [], couleurs: [] })
          setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false })
        } else {
          throw new Error(data.error || "Erreur lors du chargement")
        }
      } catch (err: any) {
        console.error("❌ Erreur chargement luminaires:", err)
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
      yearRange,
      sliderModified,
      sortField,
      sortDirection,
      pagination.limit,
    ],
  )

  useEffect(() => {
    fetchLuminaires(1)
  }, [fetchLuminaires])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const handleYearRangeChange = (range: number[]) => {
    setYearRange(range)
    setSliderModified(true)
  }

  const handleSort = (field: string, direction: string) => {
    setSortField(field)
    setSortDirection(direction)
  }

  const handleAddSuccess = () => {
    fetchLuminaires(1)
    toast.success("Luminaire ajouté avec succès !")
  }

  const handleExportImages = async () => {
    try {
      toast.info("Préparation de l'export des images...")
      const response = await fetch("/api/export/images")

      if (!response.ok) {
        throw new Error("Erreur lors de l'export")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "luminaires-images.zip"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Export des images terminé !")
    } catch (error: any) {
      console.error("❌ Erreur export images:", error)
      toast.error("Erreur lors de l'export des images")
    }
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedDesigner("")
    setSelectedPeriode("")
    setSelectedMateriaux("")
    setSelectedCouleurs("")
    setYearRange([1900, 2024])
    setSliderModified(false)
    setSortField("nom")
    setSortDirection("asc")
  }

  if (loading && luminaires.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p>Chargement des luminaires...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar des filtres */}
        <div className="lg:w-80 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif">Filtres</h2>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset
              </Button>
            </div>

            <div className="space-y-4">
              <SearchBar onSearch={handleSearch} />

              <DropdownFilter
                label="Designer"
                options={filters.designers}
                value={selectedDesigner}
                onChange={setSelectedDesigner}
              />

              <DropdownFilter
                label="Période"
                options={filters.periodes}
                value={selectedPeriode}
                onChange={setSelectedPeriode}
              />

              <DropdownFilter
                label="Matériaux"
                options={filters.materiaux}
                value={selectedMateriaux}
                onChange={setSelectedMateriaux}
              />

              <DropdownFilter
                label="Couleurs"
                options={filters.couleurs}
                value={selectedCouleurs}
                onChange={setSelectedCouleurs}
              />

              <RangeSlider label="Années" min={1900} max={2024} value={yearRange} onChange={handleYearRangeChange} />
            </div>
          </div>

          {/* Actions admin */}
          {canAdd && (
            <div className="bg-white p-6 rounded-xl shadow-lg space-y-3">
              <h3 className="font-semibold text-gray-900">Actions</h3>

              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full flex items-center gap-2"
                style={{ backgroundColor: "#f2d895", color: "#000" }}
              >
                <Plus className="w-4 h-4" />
                Ajouter un luminaire
              </Button>

              <CSVExportButton />

              <Button
                onClick={handleExportImages}
                variant="outline"
                className="w-full flex items-center gap-2 bg-transparent"
              >
                <Download className="w-4 h-4" />
                Exporter les images
              </Button>
            </div>
          )}
        </div>

        {/* Contenu principal */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-serif text-gray-900">Luminaires</h1>
                  <p className="text-gray-600">
                    {pagination.total} luminaire{pagination.total > 1 ? "s" : ""} trouvé
                    {pagination.total > 1 ? "s" : ""}
                  </p>
                </div>

                <SortSelector sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              </div>
            </div>

            <div className="p-6">
              {error ? (
                <div className="text-center py-16">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={() => fetchLuminaires(1)}>Réessayer</Button>
                </div>
              ) : luminaires.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-600">Aucun luminaire trouvé avec ces critères.</p>
                </div>
              ) : (
                <>
                  <GalleryGrid luminaires={luminaires} />

                  {pagination.hasMore && (
                    <div className="text-center mt-8">
                      <Button onClick={() => fetchLuminaires(pagination.page + 1)} disabled={loading}>
                        {loading ? "Chargement..." : "Charger plus"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'ajout */}
      <LuminaireFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  )
}
