"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { SortSelector } from "@/components/SortSelector"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Plus } from "lucide-react"

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
  filename: string
  image: string | null
  materiaux: string[]
  couleurs: string[]
  dimensions: any
  images: string[]
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  "Artiste / Dates": string
  Spécialité: string
  "Collaboration / Œuvre": string
  "Nom luminaire": string
  Année: string
  Signé: string
  "Nom du fichier": string
}

interface ApiResponse {
  success: boolean
  luminaires: Luminaire[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
  filters: {
    designers: string[]
    periodes: string[]
    materiaux: string[]
    couleurs: string[]
  }
}

export default function LuminairesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { userData, loading: authLoading } = useAuth()

  // États principaux
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [allLuminaires, setAllLuminaires] = useState<Luminaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // États de pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLuminaires, setTotalLuminaires] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // États de filtres
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriode, setSelectedPeriode] = useState("")
  const [selectedMateriaux, setSelectedMateriaux] = useState("")
  const [selectedCouleurs, setSelectedCouleurs] = useState("")
  const [yearRange, setYearRange] = useState<[number, number]>([1900, 2024])
  const [sliderModified, setSliderModified] = useState(false)

  // États de tri
  const [sortField, setSortField] = useState("nom")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Options de filtres
  const [filterOptions, setFilterOptions] = useState({
    designers: [] as string[],
    periodes: [] as string[],
    materiaux: [] as string[],
    couleurs: [] as string[],
  })

  // Charger tous les luminaires pour les statistiques
  const loadAllLuminaires = useCallback(async () => {
    try {
      const response = await fetch("/api/luminaires?limit=9999")
      const data: ApiResponse = await response.json()

      if (data.success) {
        setAllLuminaires(data.luminaires)
        setFilterOptions(data.filters)

        // Calculer la plage d'années automatiquement
        const years = data.luminaires
          .map((l) => l.annee || l.year)
          .filter((year): year is number => year !== null && year > 0)

        if (years.length > 0) {
          const minYear = Math.min(...years)
          const maxYear = Math.max(...years)
          if (!sliderModified) {
            setYearRange([minYear, maxYear])
          }
        }
      }
    } catch (error) {
      console.error("❌ Erreur chargement tous luminaires:", error)
    }
  }, [sliderModified])

  // Charger les luminaires avec filtres
  const loadLuminaires = useCallback(
    async (page = 1, resetPage = true) => {
      try {
        setLoading(true)
        setError(null)

        if (resetPage) {
          setCurrentPage(1)
        }

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

        // N'ajouter les filtres d'année que si le slider a été modifié
        if (sliderModified) {
          params.append("yearMin", yearRange[0].toString())
          params.append("yearMax", yearRange[1].toString())
        }

        console.log("🔍 Chargement avec paramètres:", Object.fromEntries(params))

        const response = await fetch(`/api/luminaires?${params}`)
        const data: ApiResponse = await response.json()

        if (data.success) {
          setLuminaires(data.luminaires)
          setCurrentPage(data.pagination.page)
          setTotalPages(data.pagination.totalPages)
          setTotalLuminaires(data.pagination.total)
          setHasMore(data.pagination.hasMore)
          setFilterOptions(data.filters)

          console.log(
            `✅ ${data.luminaires.length} luminaires chargés (page ${data.pagination.page}/${data.pagination.totalPages})`,
          )
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
      sortField,
      sortDirection,
      sliderModified,
    ],
  )

  // Charger plus de luminaires (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return

    try {
      setLoading(true)
      const nextPage = currentPage + 1

      const params = new URLSearchParams({
        page: nextPage.toString(),
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
      const data: ApiResponse = await response.json()

      if (data.success) {
        setLuminaires((prev) => [...prev, ...data.luminaires])
        setCurrentPage(data.pagination.page)
        setHasMore(data.pagination.hasMore)
        console.log(`✅ ${data.luminaires.length} luminaires supplémentaires chargés`)
      }
    } catch (err: any) {
      console.error("❌ Erreur chargement plus:", err)
      toast.error("Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }, [
    hasMore,
    loading,
    currentPage,
    searchTerm,
    selectedDesigner,
    selectedPeriode,
    selectedMateriaux,
    selectedCouleurs,
    yearRange,
    sortField,
    sortDirection,
    sliderModified,
  ])

  // Gestionnaire de création de luminaire
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

  // Gestionnaires de filtres
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const handleDesignerChange = useCallback((designer: string) => {
    setSelectedDesigner(designer)
  }, [])

  const handlePeriodeChange = useCallback((periode: string) => {
    setSelectedPeriode(periode)
  }, [])

  const handleMateriauxChange = useCallback((materiaux: string) => {
    setSelectedMateriaux(materiaux)
  }, [])

  const handleCouleursChange = useCallback((couleurs: string) => {
    setSelectedCouleurs(couleurs)
  }, [])

  const handleYearRangeChange = useCallback((range: [number, number]) => {
    setYearRange(range)
    setSliderModified(true)
  }, [])

  const handleSortChange = useCallback((field: string, direction: "asc" | "desc") => {
    setSortField(field)
    setSortDirection(direction)
  }, [])

  const resetFilters = useCallback(() => {
    setSearchTerm("")
    setSelectedDesigner("")
    setSelectedPeriode("")
    setSelectedMateriaux("")
    setSelectedCouleurs("")
    setSliderModified(false)
    setSortField("nom")
    setSortDirection("asc")
  }, [])

  // Statistiques calculées
  const stats = useMemo(() => {
    const filteredLuminaires = sliderModified
      ? allLuminaires.filter((l) => {
          const year = l.annee || l.year
          return year && year >= yearRange[0] && year <= yearRange[1]
        })
      : allLuminaires

    return {
      total: sliderModified ? filteredLuminaires.length : allLuminaires.length,
      withImages: filteredLuminaires.filter((l) => l.image).length,
      designers: new Set(filteredLuminaires.map((l) => l.designer || l["Artiste / Dates"]).filter(Boolean)).size,
      periods: new Set(filteredLuminaires.map((l) => l.periode || l["Spécialité"]).filter(Boolean)).size,
    }
  }, [allLuminaires, yearRange, sliderModified])

  // Effets
  useEffect(() => {
    loadAllLuminaires()
  }, [loadAllLuminaires])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadLuminaires(1, true)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [loadLuminaires])

  // Permissions
  const canAdd = !authLoading && userData?.role === "admin"

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif text-gray-900 mb-2">Luminaires</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>{stats.total.toLocaleString()} luminaires</span>
            <span>{stats.withImages.toLocaleString()} avec images</span>
            <span>{stats.designers} designers</span>
            <span>{stats.periods} périodes</span>
          </div>
        </div>

        {canAdd && (
          <Button
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: "#f2d895", color: "#000" }}
            className="hover:opacity-90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="space-y-6">
          {/* Recherche */}
          <SearchBar
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Rechercher par nom, designer, description..."
          />

          {/* Filtres dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DropdownFilter
              label="Designer"
              value={selectedDesigner}
              onChange={handleDesignerChange}
              options={filterOptions.designers}
              placeholder="Tous les designers"
            />
            <DropdownFilter
              label="Période"
              value={selectedPeriode}
              onChange={handlePeriodeChange}
              options={filterOptions.periodes}
              placeholder="Toutes les périodes"
            />
            <DropdownFilter
              label="Matériaux"
              value={selectedMateriaux}
              onChange={handleMateriauxChange}
              options={filterOptions.materiaux}
              placeholder="Tous les matériaux"
            />
            <DropdownFilter
              label="Couleurs"
              value={selectedCouleurs}
              onChange={handleCouleursChange}
              options={filterOptions.couleurs}
              placeholder="Toutes les couleurs"
            />
          </div>

          {/* Slider d'années */}
          <div>
            <RangeSlider
              label="Période (années)"
              min={1900}
              max={2024}
              value={yearRange}
              onChange={handleYearRangeChange}
              formatValue={(value) => value.toString()}
            />
            {sliderModified && (
              <p className="text-xs text-gray-500 mt-1">
                Filtre actif: {yearRange[0]} - {yearRange[1]}
              </p>
            )}
          </div>

          {/* Tri et actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <SortSelector
              value={sortField}
              direction={sortDirection}
              onChange={handleSortChange}
              options={[
                { value: "nom", label: "Nom" },
                { value: "designer", label: "Designer" },
                { value: "annee", label: "Année" },
              ]}
            />

            <Button variant="outline" onClick={resetFilters} className="text-sm bg-transparent">
              Réinitialiser les filtres
            </Button>
          </div>
        </div>
      </div>

      {/* Résultats */}
      {error ? (
        <div className="text-center py-16">
          <p className="text-red-600 mb-4">Erreur: {error}</p>
          <Button onClick={() => loadLuminaires(1, true)}>Réessayer</Button>
        </div>
      ) : (
        <>
          <GalleryGrid luminaires={luminaires} loading={loading} />

          {/* Pagination */}
          {hasMore && !loading && (
            <div className="text-center mt-12">
              <Button
                onClick={loadMore}
                variant="outline"
                className="px-8 py-3 bg-transparent"
                style={{ backgroundColor: "#f2d895", color: "#000", border: "none" }}
              >
                Charger plus ({totalLuminaires - luminaires.length} restants)
              </Button>
            </div>
          )}

          {loading && luminaires.length > 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">Chargement...</p>
            </div>
          )}

          {!loading && luminaires.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-600 mb-4">Aucun luminaire trouvé avec ces critères.</p>
              <Button onClick={resetFilters} variant="outline">
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal d'ajout */}
      <LuminaireFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateLuminaire} />
    </div>
  )
}
