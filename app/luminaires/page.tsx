"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { Button } from "@/components/ui/button"
import { Grid, List, Plus } from "lucide-react"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [allLuminaires, setAllLuminaires] = useState<any[]>([]) // Pour les stats globales
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [columns, setColumns] = useState(4)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // États pour les filtres et la pagination
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [yearRange, setYearRange] = useState<number[]>([1165, 2025])
  const [sliderModified, setSliderModified] = useState(false)
  const [sortField, setSortField] = useState("nom")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const { userData } = useAuth()
  const isAdmin = userData?.role === "admin"

  // Charger toutes les données pour les statistiques globales
  const loadAllLuminaires = useCallback(async () => {
    try {
      const response = await fetch(`/api/luminaires?limit=10000&page=1`)
      const data = await response.json()
      if (data.success) {
        setAllLuminaires(data.luminaires)
      }
    } catch (err) {
      console.error("❌ Erreur chargement données globales:", err)
    }
  }, [])

  // Fonction pour charger les luminaires avec scroll infini
  const loadLuminaires = useCallback(
    async (page = 1, append = false) => {
      try {
        if (page === 1) {
          setLoading(true)
          setError(null)
        } else {
          setLoadingMore(true)
        }

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "50",
          search: searchTerm,
          designer: selectedDesigner,
          sortField,
          sortDirection,
        })

        // Ajouter les filtres d'année seulement si le slider a été modifié manuellement
        if (sliderModified) {
          params.append("yearMin", yearRange[0].toString())
          params.append("yearMax", yearRange[1].toString())
        }

        console.log(`🔍 Chargement page ${page} avec filtres:`, Object.fromEntries(params))

        const response = await fetch(`/api/luminaires?${params}`)
        const data = await response.json()

        console.log("📊 Données reçues:", data)

        if (data.success) {
          if (append && page > 1) {
            setLuminaires((prev) => [...prev, ...data.luminaires])
          } else {
            setLuminaires(data.luminaires)
            setCurrentPage(1)
          }

          setTotalItems(data.pagination.total)
          setHasMore(data.pagination.hasMore)

          console.log(`📊 ${data.luminaires.length} luminaires chargés depuis MongoDB (page ${page})`)
          console.log(`📊 Total dans la base: ${data.pagination.total}`)
        } else {
          throw new Error(data.error || "Erreur lors du chargement")
        }
      } catch (err: any) {
        console.error("❌ Erreur chargement:", err)
        setError(err.message)
        toast.error("Erreur lors du chargement des luminaires")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [searchTerm, selectedDesigner, sortField, sortDirection, sliderModified, yearRange],
  )

  // Charger les données globales au montage
  useEffect(() => {
    loadAllLuminaires()
  }, [loadAllLuminaires])

  // Charger les luminaires au montage et lors des changements de filtres
  useEffect(() => {
    setCurrentPage(1)
    loadLuminaires(1, false)
  }, [loadLuminaires])

  // Fonction pour charger plus de luminaires (scroll infini)
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = currentPage + 1
      console.log(`📄 Chargement page suivante: ${nextPage}`)
      setCurrentPage(nextPage)
      loadLuminaires(nextPage, true)
    }
  }, [loadingMore, hasMore, loading, currentPage, loadLuminaires])

  // Scroll infini optimisé
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight

      if (scrollTop + clientHeight >= scrollHeight - 1000) {
        loadMore()
      }
    }

    let timeoutId: NodeJS.Timeout

    const throttledHandleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleScroll, 200)
    }

    window.addEventListener("scroll", throttledHandleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", throttledHandleScroll)
      clearTimeout(timeoutId)
    }
  }, [loadMore])

  // Fonction pour mettre à jour un luminaire
  const handleItemUpdate = useCallback(async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/luminaires/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (data.success) {
        setLuminaires((prev) => prev.map((item) => (item._id === id ? { ...item, ...updates } : item)))
        toast.success("Luminaire mis à jour avec succès")
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      console.error("❌ Erreur mise à jour:", err)
      toast.error("Erreur lors de la mise à jour")
    }
  }, [])

  // Fonction pour créer un nouveau luminaire
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
          loadAllLuminaires() // Recharger les données globales
        } else {
          throw new Error(data.error)
        }
      } catch (err: any) {
        console.error("❌ Erreur création:", err)
        toast.error("Erreur lors de la création")
      }
    },
    [loadLuminaires, loadAllLuminaires],
  )

  // Options pour les filtres (calculées à partir de TOUTES les données)
  const filterOptions = useMemo(() => {
    const designers = [...new Set(allLuminaires.map((l) => l["Artiste / Dates"] || l.designer).filter(Boolean))].sort()
    return { designers }
  }, [allLuminaires])

  // Calculer la plage d'années disponibles (à partir de TOUTES les données)
  const yearBounds = useMemo(() => {
    const years = allLuminaires.map((l) => l.annee || l.year || l["Année"]).filter(Boolean)
    if (years.length === 0) return { min: 1165, max: 2025 }
    return {
      min: Math.min(...years),
      max: Math.max(...years),
    }
  }, [allLuminaires])

  // Initialiser la plage d'années avec les vraies valeurs SANS déclencher de rechargement
  useEffect(() => {
    if (allLuminaires.length > 0 && !sliderModified) {
      setYearRange([yearBounds.min, yearBounds.max])
    }
  }, [yearBounds, allLuminaires.length, sliderModified])

  // Fonction pour gérer le changement manuel du slider par l'utilisateur
  const handleYearRangeChange = (newRange: number[]) => {
    setYearRange(newRange)
    setSliderModified(true)
  }

  if (loading && luminaires.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des luminaires...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && luminaires.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur: {error}</p>
          <Button onClick={() => loadLuminaires(1, false)}>Réessayer</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-gray-900 mb-2">Luminaires</h1>
          <p className="text-gray-600">
            {totalItems > 0 ? `${luminaires.length}/${totalItems} luminaires` : "Aucun luminaire trouvé"}
          </p>
        </div>

        <div className="flex items-center gap-4 mt-4 lg:mt-0">
          {isAdmin && (
            <Button
              onClick={() => setIsModalOpen(true)}
              style={{ backgroundColor: "#f2d895", color: "#000" }}
              className="hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
              <Grid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>

          {viewMode === "grid" && (
            <select
              value={columns}
              onChange={(e) => setColumns(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value={3}>3 colonnes</option>
              <option value={4}>4 colonnes</option>
              <option value={5}>5 colonnes</option>
              <option value={6}>6 colonnes</option>
              <option value={8}>8 colonnes</option>
            </select>
          )}
        </div>
      </div>

      {/* Filtres - Première ligne */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />

        <DropdownFilter
          label="Designer"
          value={selectedDesigner}
          onChange={setSelectedDesigner}
          options={filterOptions.designers}
        />

        <select
          value={`${sortField}-${sortDirection}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split("-")
            setSortField(field)
            setSortDirection(direction as "asc" | "desc")
          }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="nom-asc">Nom luminaire A-Z</option>
          <option value="nom-desc">Nom luminaire Z-A</option>
          <option value="designer-asc">Designer A-Z</option>
          <option value="designer-desc">Designer Z-A</option>
          <option value="annee-asc">Année croissante</option>
          <option value="annee-desc">Année décroissante</option>
        </select>
      </div>

      {/* Filtres - Deuxième ligne : Slider chronologique */}
      <div className="mb-8">
        <RangeSlider
          min={yearBounds.min}
          max={yearBounds.max}
          value={yearRange}
          onChange={handleYearRangeChange}
          label="Chronologie"
        />
      </div>

      {/* Grille des luminaires */}
      <GalleryGrid items={luminaires} viewMode={viewMode} onItemUpdate={handleItemUpdate} columns={columns} />

      {/* Indicateur de chargement pour le scroll infini */}
      {loadingMore && (
        <div className="text-center mt-8">
          <div className="inline-flex items-center px-4 py-2 bg-orange-100 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
            <span className="text-orange-500">Chargement de plus de luminaires...</span>
          </div>
        </div>
      )}

      {/* Message fin de liste */}
      {!hasMore && luminaires.length > 0 && (
        <div className="text-center mt-8 py-4">
          <p className="text-gray-500">
            ✅ Tous les luminaires ont été chargés ({luminaires.length} sur {totalItems} total)
          </p>
        </div>
      )}

      {/* Message aucun résultat */}
      {luminaires.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Aucun luminaire trouvé</p>
          <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
        </div>
      )}

      {/* Modal de création */}
      {isAdmin && (
        <LuminaireFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateLuminaire}
        />
      )}
    </div>
  )
}
