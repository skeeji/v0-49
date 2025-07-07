"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { RoleGuard } from "@/components/RoleGuard"
import { useAuth } from "@/contexts/AuthContext"
import { Plus, Filter, X, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Luminaire {
  _id: string
  nom: string
  designer: string
  annee?: string
  editeur?: string
  periode?: string
  collaboration?: string
  description?: string
  materiaux?: string[]
  dimensions?: string
  estimation?: string
  filename?: string
  images?: string[]
  designerImageFilename?: string
  isFavorite?: boolean
  createdAt?: string
  updatedAt?: string
}

interface FilterState {
  search: string
  designer: string
  editeur: string
  periode: string
  materiaux: string
  anneeRange: [number, number]
  showFavorites: boolean
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  designer: "",
  editeur: "",
  periode: "",
  materiaux: "",
  anneeRange: [1800, 2024],
  showFavorites: false,
}

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [filteredLuminaires, setFilteredLuminaires] = useState<Luminaire[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [sortBy, setSortBy] = useState("nom")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLuminaire, setEditingLuminaire] = useState<Luminaire | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Options pour les filtres
  const [designers, setDesigners] = useState<string[]>([])
  const [editeurs, setEditeurs] = useState<string[]>([])
  const [periodes, setPeriodes] = useState<string[]>([])
  const [materiaux, setMateriaux] = useState<string[]>([])

  const { user } = useAuth()
  const { toast } = useToast()

  const itemsPerPage = 24

  // Charger les luminaires
  const fetchLuminaires = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.designer && { designer: filters.designer }),
        ...(filters.editeur && { editeur: filters.editeur }),
        ...(filters.periode && { periode: filters.periode }),
        ...(filters.materiaux && { materiaux: filters.materiaux }),
        ...(filters.showFavorites && { favorites: "true" }),
        minYear: filters.anneeRange[0].toString(),
        maxYear: filters.anneeRange[1].toString(),
      })

      const response = await fetch(`/api/luminaires?${params}`)
      const data = await response.json()

      if (data.success) {
        setLuminaires(data.luminaires)
        setFilteredLuminaires(data.luminaires)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des luminaires:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les luminaires",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Charger les options de filtres
  const fetchFilterOptions = async () => {
    try {
      const response = await fetch("/api/luminaires/filters")
      const data = await response.json()

      if (data.success) {
        setDesigners(data.designers || [])
        setEditeurs(data.editeurs || [])
        setPeriodes(data.periodes || [])
        setMateriaux(data.materiaux || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des filtres:", error)
    }
  }

  useEffect(() => {
    fetchLuminaires()
  }, [currentPage, sortBy, sortOrder, filters])

  useEffect(() => {
    fetchFilterOptions()
  }, [])

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset à la première page lors du changement de filtre
  }

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS)
    setCurrentPage(1)
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
    setCurrentPage(1)
  }

  const handleEdit = (luminaire: Luminaire) => {
    setEditingLuminaire(luminaire)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingLuminaire(null)
    fetchLuminaires() // Recharger les données après modification
  }

  const exportToCSV = async () => {
    setIsExporting(true)
    try {
      // Récupérer tous les luminaires sans pagination
      const response = await fetch("/api/luminaires?limit=10000")
      const data = await response.json()

      if (data.success) {
        const csvData = data.luminaires.map((luminaire: Luminaire) => ({
          Nom: luminaire.nom || "",
          Designer: luminaire.designer || "",
          Année: luminaire.annee || "",
          Éditeur: luminaire.editeur || "",
          Spécialité: luminaire.periode || "",
          "Collaboration / Œuvre": luminaire.collaboration || "",
          Description: luminaire.description || "",
          Matériaux: Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join("; ") : luminaire.materiaux || "",
          Dimensions: luminaire.dimensions || "",
          Estimation: luminaire.estimation || "",
          "Image principale": luminaire.filename || "",
          "Images secondaires": Array.isArray(luminaire.images) ? luminaire.images.join("; ") : "",
          "Image designer": luminaire.designerImageFilename || "",
        }))

        // Créer le contenu CSV
        const headers = Object.keys(csvData[0])
        const csvContent = [
          headers.join(","),
          ...csvData.map((row) =>
            headers.map((header) => `"${(row[header] || "").toString().replace(/"/g, '""')}"`).join(","),
          ),
        ].join("\n")

        // Télécharger le fichier
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `luminaires_${new Date().toISOString().split("T")[0]}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast({
          title: "Export réussi",
          description: `${csvData.length} luminaires exportés`,
        })
      }
    } catch (error) {
      console.error("Erreur lors de l'export:", error)
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "anneeRange") {
      const [min, max] = value as [number, number]
      return min !== INITIAL_FILTERS.anneeRange[0] || max !== INITIAL_FILTERS.anneeRange[1]
    }
    if (key === "showFavorites") return value
    return value !== "" && value !== INITIAL_FILTERS[key as keyof FilterState]
  }).length

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-serif text-gray-900">Luminaires</h1>
            <p className="text-gray-600 mt-1">
              {totalCount} luminaire{totalCount > 1 ? "s" : ""} au total
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={exportToCSV} disabled={isExporting} variant="outline" size="sm">
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Export...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>

            <RoleGuard requiredRole="admin">
              <Button onClick={() => setIsModalOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </RoleGuard>
          </div>
        </div>

        {/* Barre de recherche et contrôles */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={filters.search}
              onChange={(value) => handleFilterChange("search", value)}
              placeholder="Rechercher par nom, designer, description..."
            />
          </div>

          <div className="flex gap-2">
            <SortSelector
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSort}
              options={[
                { value: "nom", label: "Nom" },
                { value: "designer", label: "Designer" },
                { value: "annee", label: "Année" },
                { value: "createdAt", label: "Date d'ajout" },
              ]}
            />

            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Panneau de filtres */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Filtres</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Effacer
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <DropdownFilter
                  label="Designer"
                  value={filters.designer}
                  onChange={(value) => handleFilterChange("designer", value)}
                  options={designers}
                  placeholder="Tous les designers"
                />

                <DropdownFilter
                  label="Éditeur"
                  value={filters.editeur}
                  onChange={(value) => handleFilterChange("editeur", value)}
                  options={editeurs}
                  placeholder="Tous les éditeurs"
                />

                <DropdownFilter
                  label="Période"
                  value={filters.periode}
                  onChange={(value) => handleFilterChange("periode", value)}
                  options={periodes}
                  placeholder="Toutes les périodes"
                />

                <DropdownFilter
                  label="Matériaux"
                  value={filters.materiaux}
                  onChange={(value) => handleFilterChange("materiaux", value)}
                  options={materiaux}
                  placeholder="Tous les matériaux"
                />
              </div>

              <div className="mt-6 space-y-4">
                <RangeSlider
                  label="Année"
                  min={1800}
                  max={2024}
                  value={filters.anneeRange}
                  onChange={(value) => handleFilterChange("anneeRange", value)}
                />

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="favorites"
                    checked={filters.showFavorites}
                    onChange={(e) => handleFilterChange("showFavorites", e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="favorites" className="text-sm font-medium">
                    Afficher uniquement les favoris
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grille des luminaires */}
        <GalleryGrid
          luminaires={filteredLuminaires}
          loading={loading}
          onEdit={handleEdit}
          onRefresh={fetchLuminaires}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        )}
      </div>

      {/* Modal d'ajout/édition */}
      <LuminaireFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        luminaire={editingLuminaire}
        onSuccess={fetchLuminaires}
      />
    </div>
  )
}
