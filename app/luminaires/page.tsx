"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { SortSelector } from "@/components/SortSelector"
import { Button } from "@/components/ui/button"
import { Grid, List, Plus } from "lucide-react"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { CSVExportButton } from "@/components/CSVExportButton"
import { useToast } from "@/hooks/useToast"

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [columns, setColumns] = useState(4)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // États pour les filtres et la pagination
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriode, setSelectedPeriode] = useState("")
  const [selectedMateriaux, setSelectedMateriaux] = useState("")
  const [selectedCouleurs, setSelectedCouleurs] = useState("")
  const [sortField, setSortField] = useState("nom")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const { showToast } = useToast()

  // CORRECTION: Fonction pour charger TOUS les luminaires
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
          limit: "10000", // CORRECTION: Charger tous les luminaires
          search: searchTerm,
          designer: selectedDesigner,
          periode: selectedPeriode,
          materiaux: selectedMateriaux,
          couleurs: selectedCouleurs,
          sortField,
          sortDirection,
        })

        console.log(`🔍 Chargement page ${page} avec filtres:`, Object.fromEntries(params))

        const response = await fetch(`/api/luminaires?${params}`)
        const data = await response.json()

        console.log("📊 Données reçues:", data)

        if (data.success) {
          // Transformer les données pour l'affichage
          const transformedLuminaires = data.luminaires.map((luminaire: any) => ({
            ...luminaire,
            id: luminaire._id,
            name: luminaire.nom,
            artist: luminaire.designer,
            year: luminaire.annee,
            image: luminaire["Nom du fichier"]
              ? `/api/images/filename/${luminaire["Nom du fichier"]}`
              : "/placeholder.svg",
            filename: luminaire["Nom du fichier"] || "",
          }))

          if (append && page > 1) {
            setLuminaires((prev) => [...prev, ...transformedLuminaires])
          } else {
            setLuminaires(transformedLuminaires)
            setCurrentPage(1)
          }

          setTotalItems(data.pagination.total)
          setHasMore(data.pagination.hasMore)

          console.log(`📊 ${transformedLuminaires.length} luminaires chargés depuis MongoDB (page ${page})`)
          console.log(`📊 Total dans la base: ${data.pagination.total}`)
        } else {
          throw new Error(data.error || "Erreur lors du chargement")
        }
      } catch (err: any) {
        console.error("❌ Erreur chargement:", err)
        setError(err.message)
        showToast("Erreur lors du chargement des luminaires", "error")
      } finally {
        setLoading(false)
        setLoadingMore(false)
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
      showToast,
    ],
  )

  // Charger les luminaires au montage et lors des changements de filtres
  useEffect(() => {
    setCurrentPage(1)
    loadLuminaires(1, false)
  }, [searchTerm, selectedDesigner, selectedPeriode, selectedMateriaux, selectedCouleurs, sortField, sortDirection])

  // Fonction pour mettre à jour un luminaire
  const handleItemUpdate = useCallback(
    async (id: string, updates: any) => {
      try {
        const response = await fetch(`/api/luminaires/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })

        const data = await response.json()

        if (data.success) {
          setLuminaires((prev) => prev.map((item) => (item._id === id ? { ...item, ...updates } : item)))
          showToast("Luminaire mis à jour avec succès", "success")
        } else {
          throw new Error(data.error)
        }
      } catch (err: any) {
        console.error("❌ Erreur mise à jour:", err)
        showToast("Erreur lors de la mise à jour", "error")
      }
    },
    [showToast],
  )

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
          showToast("Luminaire créé avec succès", "success")
          setIsModalOpen(false)
          // Recharger la première page
          loadLuminaires(1, false)
        } else {
          throw new Error(data.error)
        }
      } catch (err: any) {
        console.error("❌ Erreur création:", err)
        showToast("Erreur lors de la création", "error")
      }
    },
    [loadLuminaires, showToast],
  )

  // Options pour les filtres (calculées à partir des données)
  const filterOptions = useMemo(() => {
    const designers = [...new Set(luminaires.map((l) => l.designer).filter(Boolean))].sort()
    const periodes = [...new Set(luminaires.map((l) => l.periode).filter(Boolean))].sort()
    const materiaux = [...new Set(luminaires.flatMap((l) => l.materiaux || []).filter(Boolean))].sort()
    const couleurs = [...new Set(luminaires.flatMap((l) => l.couleurs || []).filter(Boolean))].sort()

    return { designers, periodes, materiaux, couleurs }
  }, [luminaires])

  if (loading && luminaires.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange mx-auto mb-4"></div>
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
          <h1 className="text-3xl font-playfair text-dark mb-2">Luminaires</h1>
          <p className="text-gray-600">
            {totalItems > 0 ? `${luminaires.length} luminaires` : "Aucun luminaire trouvé"}
          </p>
        </div>

        <div className="flex items-center gap-4 mt-4 lg:mt-0">
          <Button onClick={() => setIsModalOpen(true)} className="bg-orange hover:bg-orange/90">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>

          <CSVExportButton data={luminaires} filename="luminaires" />

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

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="lg:col-span-2">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />
        </div>

        <DropdownFilter
          label="Designer"
          value={selectedDesigner}
          onChange={setSelectedDesigner}
          options={filterOptions.designers}
        />

        <DropdownFilter
          label="Période"
          value={selectedPeriode}
          onChange={setSelectedPeriode}
          options={filterOptions.periodes}
        />

        <DropdownFilter
          label="Matériaux"
          value={selectedMateriaux}
          onChange={setSelectedMateriaux}
          options={filterOptions.materiaux}
        />

        <SortSelector
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={(field, direction) => {
            setSortField(field)
            setSortDirection(direction)
          }}
          options={[
            { value: "nom", label: "Nom" },
            { value: "designer", label: "Designer" },
            { value: "annee", label: "Année" },
            { value: "periode", label: "Période" },
          ]}
        />
      </div>

      {/* Grille des luminaires */}
      <GalleryGrid items={luminaires} viewMode={viewMode} onItemUpdate={handleItemUpdate} columns={columns} />

      {/* Message aucun résultat */}
      {luminaires.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Aucun luminaire trouvé</p>
          <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
        </div>
      )}

      {/* Modal de création */}
      <LuminaireFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateLuminaire} />
    </div>
  )
}
