"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { SortSelector } from "@/components/SortSelector"
import { GalleryGrid } from "@/components/GalleryGrid"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [allLuminaires, setAllLuminaires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriode, setSelectedPeriode] = useState("")
  const [selectedMateriaux, setSelectedMateriaux] = useState("")
  const [selectedCouleurs, setSelectedCouleurs] = useState("")
  const [yearRange, setYearRange] = useState([1900, 2024])
  const [sliderModified, setSliderModified] = useState(false)
  const [sortField, setSortField] = useState("nom")
  const [sortDirection, setSortDirection] = useState("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLuminaires, setTotalLuminaires] = useState(0)
  const [filterOptions, setFilterOptions] = useState({
    designers: [] as string[],
    periodes: [] as string[],
    materiaux: [] as string[],
    couleurs: [] as string[],
  })
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { userData, loading: authLoading } = useAuth()
  const canAdd = !authLoading && userData?.role === "admin"

  const loadLuminaires = useCallback(
    async (page = 1, resetPage = true) => {
      try {
        setLoading(true)
        if (resetPage) setCurrentPage(1)

        const params = new URLSearchParams({
          page: resetPage ? "1" : page.toString(),
          limit: "50",
          search: searchTerm,
          designer: selectedDesigner,
          periode: selectedPeriode,
          materiaux: selectedMateriaux,
          couleurs: selectedCouleurs,
          sortField,
          sortDirection,
        })

        // Ajouter les filtres d'année seulement si le slider a été modifié
        if (sliderModified) {
          params.append("yearMin", yearRange[0].toString())
          params.append("yearMax", yearRange[1].toString())
        }

        console.log("🔍 Chargement luminaires avec params:", params.toString())

        const response = await fetch(`/api/luminaires?${params}`)
        const data = await response.json()

        console.log("📊 Réponse API:", data)

        if (data.success && data.luminaires) {
          setLuminaires(data.luminaires || [])
          setTotalPages(data.pagination?.totalPages || 1)
          setTotalLuminaires(data.pagination?.total || 0)
          setCurrentPage(data.pagination?.page || 1)

          if (data.filters) {
            setFilterOptions({
              designers: data.filters.designers || [],
              periodes: data.filters.periodes || [],
              materiaux: data.filters.materiaux || [],
              couleurs: data.filters.couleurs || [],
            })
          }
        } else {
          console.error("❌ Erreur dans la réponse:", data.error)
          setLuminaires([])
        }
      } catch (error) {
        console.error("❌ Erreur chargement luminaires:", error)
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
    ],
  )

  const loadAllLuminaires = useCallback(async () => {
    try {
      const response = await fetch("/api/luminaires?limit=9999")
      const data = await response.json()
      if (data.success && data.luminaires) {
        setAllLuminaires(data.luminaires || [])
      }
    } catch (error) {
      console.error("❌ Erreur chargement tous luminaires:", error)
      setAllLuminaires([])
    }
  }, [])

  useEffect(() => {
    loadLuminaires(1, false)
  }, [loadLuminaires])

  useEffect(() => {
    loadAllLuminaires()
  }, [loadAllLuminaires])

  const handleCreateLuminaire = useCallback(
    async (luminaireData: any) => {
      try {
        const response = await fetch("/api/luminaires", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(luminaireData),
        })

        const data = await response.json()

        if (data.success) {
          toast.success("Luminaire créé avec succès")
          setIsModalOpen(false)
          loadLuminaires(1, false)
          loadAllLuminaires()
        } else {
          throw new Error(data.error)
        }

        // AJOUTER CETTE LIGNE
        return data // On retourne la réponse de l'API
      } catch (err: any) {
        console.error("❌ Erreur création:", err)
        toast.error("Erreur lors de la création")

        // AJOUTER CETTE LIGNE
        return { success: false, error: err.message } // On retourne aussi en cas d'erreur
      }
    },
    [loadLuminaires, loadAllLuminaires],
  )

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
  }

  const handleDesignerFilter = (designer: string) => {
    setSelectedDesigner(designer)
    setCurrentPage(1)
  }

  const handlePeriodeFilter = (periode: string) => {
    setSelectedPeriode(periode)
    setCurrentPage(1)
  }

  const handleMateriauxFilter = (materiaux: string) => {
    setSelectedMateriaux(materiaux)
    setCurrentPage(1)
  }

  const handleCouleursFilter = (couleurs: string) => {
    setSelectedCouleurs(couleurs)
    setCurrentPage(1)
  }

  const handleYearRangeChange = (range: number[]) => {
    setYearRange(range)
    setSliderModified(true)
    setCurrentPage(1)
  }

  const handleSort = (field: string, direction: string) => {
    setSortField(field)
    setSortDirection(direction)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    loadLuminaires(page, false)
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
    setCurrentPage(1)
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Chargement...</p>
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
              <SearchBar value={searchTerm} onChange={handleSearch} placeholder="Rechercher..." />

              <DropdownFilter
                label="Designer"
                options={filterOptions.designers || []}
                value={selectedDesigner}
                onChange={handleDesignerFilter}
                placeholder="Tous les designers"
              />

              <DropdownFilter
                label="Période"
                options={filterOptions.periodes || []}
                value={selectedPeriode}
                onChange={handlePeriodeFilter}
                placeholder="Toutes les périodes"
              />

              <DropdownFilter
                label="Matériaux"
                options={filterOptions.materiaux || []}
                value={selectedMateriaux}
                onChange={handleMateriauxFilter}
                placeholder="Tous les matériaux"
              />

              <DropdownFilter
                label="Couleurs"
                options={filterOptions.couleurs || []}
                value={selectedCouleurs}
                onChange={handleCouleursFilter}
                placeholder="Toutes les couleurs"
              />

              <RangeSlider label="Années" min={1900} max={2024} value={yearRange} onChange={handleYearRangeChange} />
            </div>
          </div>

          {canAdd && (
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <Button
                onClick={() => setIsModalOpen(true)}
                className="w-full"
                style={{ backgroundColor: "#f2d895", color: "#000" }}
              >
                Ajouter un luminaire
              </Button>
            </div>
          )}
        </div>

        {/* Contenu principal */}
        <div className="flex-1">
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-serif text-gray-900 mb-2">Luminaires</h1>
                <p className="text-gray-600">
                  {totalLuminaires} luminaire{totalLuminaires !== 1 ? "s" : ""} trouvé
                  {totalLuminaires !== 1 ? "s" : ""}
                </p>
              </div>

              <SortSelector
                value={`${sortField}-${sortDirection}`}
                onChange={(value) => {
                  const [field, direction] = value.split("-")
                  handleSort(field, direction)
                }}
              />
            </div>
          </div>

          <GalleryGrid
            luminaires={luminaires || []}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <LuminaireFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateLuminaire} />
    </div>
  )
}
