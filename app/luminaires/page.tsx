"use client"

import { useState, useEffect } from "react"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { SortSelector } from "@/components/SortSelector"
import { GalleryGrid } from "@/components/GalleryGrid"
import { RangeSlider } from "@/components/RangeSlider"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { Button } from "@/components/ui/button"
import { Plus, Grid3X3, List, Heart } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState([])
  const [filteredLuminaires, setFilteredLuminaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriode, setSelectedPeriode] = useState("")
  const [selectedMateriaux, setSelectedMateriaux] = useState("")
  const [selectedCouleurs, setSelectedCouleurs] = useState("")
  const [yearRange, setYearRange] = useState([1900, 2024])
  const [sortField, setSortField] = useState("nom")
  const [sortDirection, setSortDirection] = useState("asc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [columns, setColumns] = useState(4)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])

  const { userData, user } = useAuth()

  const isUserFree = userData?.role === "free"
  const freeUserLimit = 20

  // Charger les favoris depuis la base de données
  useEffect(() => {
    const loadFavorites = async () => {
      if (user?.email) {
        try {
          const response = await fetch(`/api/users/favorites?email=${encodeURIComponent(user.email)}`)
          const data = await response.json()
          if (data.success) {
            setFavorites(data.favorites || [])
          }
        } catch (error) {
          console.error("❌ Erreur chargement favoris:", error)
        }
      }
    }

    loadFavorites()
  }, [user?.email])

  const fetchLuminaires = async () => {
    try {
      setLoading(true)
      console.log("🔍 Récupération des luminaires avec les paramètres:", {
        page: currentPage,
        search: searchTerm,
        designer: selectedDesigner,
        yearMin: yearRange[0],
        yearMax: yearRange[1],
        sortField,
        sortDirection,
      })

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        search: searchTerm,
        designer: selectedDesigner, // Toujours envoyer le paramètre, même vide
        yearMin: yearRange[0].toString(),
        yearMax: yearRange[1].toString(),
        sortField,
        sortDirection,
      })

      const response = await fetch(`/api/luminaires?${params}`)
      const data = await response.json()

      if (data.success) {
        setLuminaires(data.luminaires)
        setTotalPages(data.pagination?.pages || 1)
        console.log(`✅ ${data.luminaires.length} luminaires chargés`)
      } else {
        console.error("❌ Erreur API:", data.error)
        toast.error("Erreur lors du chargement des luminaires")
      }
    } catch (error) {
      console.error("❌ Erreur fetch:", error)
      toast.error("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  // Charger les luminaires au montage et lors des changements de filtres
  useEffect(() => {
    fetchLuminaires()
  }, [currentPage, searchTerm, selectedDesigner, yearRange, sortField, sortDirection])

  // Filtrer les luminaires pour les favoris
  useEffect(() => {
    if (showFavorites) {
      const favoriteLuminaires = luminaires.filter((luminaire: any) =>
        favorites.includes(luminaire._id || luminaire.id),
      )
      setFilteredLuminaires(favoriteLuminaires)
    } else {
      setFilteredLuminaires(luminaires)
    }
  }, [luminaires, showFavorites, favorites])

  const handleItemUpdate = (id: string, updates: any) => {
    setLuminaires((prev) => prev.map((item: any) => (item._id === id ? { ...item, ...updates } : item)))
  }

  const handleFormSubmit = () => {
    setShowFormModal(false)
    fetchLuminaires() // Recharger les données
    toast.success("Luminaire ajouté avec succès")
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedDesigner("")
    setSelectedPeriode("")
    setSelectedMateriaux("")
    setSelectedCouleurs("")
    setYearRange([1900, 2024])
    setCurrentPage(1)
    setShowFavorites(false)
  }

  const toggleFavorites = () => {
    setShowFavorites(!showFavorites)
  }

  // Options pour les filtres (simulées - dans un vrai projet, elles viendraient de l'API)
  const designerOptions = [
    "Tous les designers",
    "Jean-Démosthène Dugourc",
    "André-Charles Boulle",
    "Charles Cressent",
    "Jean-François Oeben",
    "David Roentgen",
  ]

  const periodeOptions = ["Toutes les périodes", "Louis XIV", "Louis XV", "Louis XVI", "Empire", "Restauration"]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif text-gray-900 mb-2">Collection de Luminaires</h1>
            <p className="text-gray-600">
              {loading ? "Chargement..." : `${filteredLuminaires.length} luminaires`}
              {showFavorites && " favoris"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton Favoris pour les utilisateurs premium/admin */}
            {user && userData?.role !== "free" && (
              <Button
                onClick={toggleFavorites}
                variant={showFavorites ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Heart className={`w-4 h-4 ${showFavorites ? "fill-current" : ""}`} />
                Favoris ({favorites.length})
              </Button>
            )}

            {userData?.role === "admin" && (
              <Button onClick={() => setShowFormModal(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            )}
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <DropdownFilter
              label="Designer"
              value={selectedDesigner}
              onChange={setSelectedDesigner}
              options={designerOptions}
            />
            <DropdownFilter
              label="Période"
              value={selectedPeriode}
              onChange={setSelectedPeriode}
              options={periodeOptions}
            />
            <DropdownFilter
              label="Matériaux"
              value={selectedMateriaux}
              onChange={setSelectedMateriaux}
              options={["Tous les matériaux", "Bronze", "Cristal", "Laiton", "Fer forgé"]}
            />
            <DropdownFilter
              label="Couleurs"
              value={selectedCouleurs}
              onChange={setSelectedCouleurs}
              options={["Toutes les couleurs", "Or", "Argent", "Bronze", "Noir"]}
            />
          </div>

          <div className="mb-4">
            <RangeSlider label="Période (années)" min={1900} max={2024} value={yearRange} onChange={setYearRange} />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Button onClick={resetFilters} variant="outline" size="sm">
              Réinitialiser les filtres
            </Button>

            <div className="flex items-center gap-4">
              <SortSelector
                sortField={sortField}
                sortDirection={sortDirection}
                onSortFieldChange={setSortField}
                onSortDirectionChange={setSortDirection}
              />

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setViewMode("grid")}
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setViewMode("list")}
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {viewMode === "grid" && (
                <select
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
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
        </div>

        {/* Grille des luminaires */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <GalleryGrid
              items={filteredLuminaires}
              viewMode={viewMode}
              onItemUpdate={handleItemUpdate}
              columns={columns}
              freeUserLimit={freeUserLimit}
              isUserFree={isUserFree}
            />

            {/* Pagination */}
            {totalPages > 1 && !showFavorites && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Précédent
                </Button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}

        {/* Modal d'ajout de luminaire */}
        {showFormModal && (
          <LuminaireFormModal
            isOpen={showFormModal}
            onClose={() => setShowFormModal(false)}
            onSubmit={handleFormSubmit}
          />
        )}
      </div>
    </div>
  )
}
