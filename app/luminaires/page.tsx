"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { SortSelector } from "@/components/SortSelector"
import { CSVExportButton } from "@/components/CSVExportButton"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { RoleGuard } from "@/components/RoleGuard"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Plus, Grid, List, Loader2 } from "lucide-react"

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState([])
  const [filteredLuminaires, setFilteredLuminaires] = useState([])
  const [displayedLuminaires, setDisplayedLuminaires] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [yearRange, setYearRange] = useState([1900, 2024])
  const [sortBy, setSortBy] = useState("name-asc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { userData } = useAuth()

  const ITEMS_PER_PAGE = 50

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  })

  // Charger les luminaires
  useEffect(() => {
    async function fetchLuminaires() {
      setIsLoading(true)
      try {
        const response = await fetch("/api/luminaires?limit=10000")
        const data = await response.json()

        if (data.success) {
          console.log(`💡 ${data.luminaires.length} luminaires chargés`)

          // Adapter les données pour l'affichage
          const adaptedLuminaires = data.luminaires.map((lum: any) => ({
            ...lum,
            id: lum._id,
            image: lum["Nom du fichier"] ? `/api/images/filename/${lum["Nom du fichier"]}` : null,
            name: lum["Nom luminaire"] || lum.nom || "Sans nom",
            artist: lum["Artiste / Dates"] || lum.designer || "",
            year: lum["Année"] || lum.annee || "",
            period: lum["Période"] || lum.periode || "",
            type: lum["Type"] || lum.type || "",
            specialty: lum["Spécialité"] || lum.specialite || "",
            collaboration: lum["Collaboration / Œuvre"] || lum.collaboration || "",
          }))

          // Pour les utilisateurs "free", limiter à 10% des luminaires
          if (userData?.role === "free") {
            const limitedLuminaires = adaptedLuminaires.slice(
              0,
              Math.max(Math.floor(adaptedLuminaires.length * 0.1), 10),
            )
            setLuminaires(limitedLuminaires)
            setFilteredLuminaires(limitedLuminaires)
          } else {
            setLuminaires(adaptedLuminaires)
            setFilteredLuminaires(adaptedLuminaires)
          }
        }
      } catch (error) {
        console.error("❌ Erreur chargement luminaires:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLuminaires()
  }, [userData])

  // Filtrer les luminaires
  useEffect(() => {
    let filtered = [...luminaires]

    if (searchTerm) {
      filtered = filtered.filter(
        (lum) =>
          lum.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lum.artist.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedDesigner) {
      filtered = filtered.filter((lum) => lum.artist.includes(selectedDesigner))
    }

    if (selectedPeriod) {
      filtered = filtered.filter((lum) => lum.period === selectedPeriod)
    }

    if (selectedType) {
      filtered = filtered.filter((lum) => lum.type === selectedType)
    }

    // Filtrer par année
    filtered = filtered.filter((lum) => {
      const year = Number.parseInt(lum.year) || 0
      return year >= yearRange[0] && year <= yearRange[1]
    })

    // Trier
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "year-asc":
          return (Number.parseInt(a.year) || 0) - (Number.parseInt(b.year) || 0)
        case "year-desc":
          return (Number.parseInt(b.year) || 0) - (Number.parseInt(a.year) || 0)
        case "artist-asc":
          return a.artist.localeCompare(b.artist)
        default:
          return 0
      }
    })

    setFilteredLuminaires(filtered)
    setPage(0)
    setHasMore(true)
    setDisplayedLuminaires([])
  }, [luminaires, searchTerm, selectedDesigner, selectedPeriod, selectedType, yearRange, sortBy])

  // Charger plus d'éléments
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    setTimeout(() => {
      const startIndex = page * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const newItems = filteredLuminaires.slice(startIndex, endIndex)

      if (page === 0) {
        setDisplayedLuminaires(newItems)
      } else {
        setDisplayedLuminaires((prev) => [...prev, ...newItems])
      }

      setPage((prev) => prev + 1)
      setHasMore(endIndex < filteredLuminaires.length)
      setIsLoadingMore(false)
    }, 300)
  }, [page, filteredLuminaires, isLoadingMore, hasMore])

  // Charger plus quand on arrive en bas
  useEffect(() => {
    if (inView && !isLoadingMore && hasMore) {
      loadMore()
    }
  }, [inView, loadMore, isLoadingMore, hasMore])

  // Charger la première page
  useEffect(() => {
    if (filteredLuminaires.length > 0 && displayedLuminaires.length === 0) {
      loadMore()
    }
  }, [filteredLuminaires, displayedLuminaires.length, loadMore])

  // Extraire les options pour les filtres
  const designers = [...new Set(luminaires.map((lum) => lum.artist).filter(Boolean))].sort()
  const periods = [...new Set(luminaires.map((lum) => lum.period).filter(Boolean))].sort()
  const types = [...new Set(luminaires.map((lum) => lum.type).filter(Boolean))].sort()

  const updateLuminaire = (id: string, updates: any) => {
    setLuminaires((prev) => prev.map((lum) => (lum.id === id ? { ...lum, ...updates } : lum)))
    setFilteredLuminaires((prev) => prev.map((lum) => (lum.id === id ? { ...lum, ...updates } : lum)))
    setDisplayedLuminaires((prev) => prev.map((lum) => (lum.id === id ? { ...lum, ...updates } : lum)))
  }

  const addLuminaire = (newLuminaire: any) => {
    const adaptedLuminaire = {
      ...newLuminaire,
      id: newLuminaire._id,
      image: newLuminaire["Nom du fichier"] ? `/api/images/filename/${newLuminaire["Nom du fichier"]}` : null,
      name: newLuminaire["Nom luminaire"] || "Sans nom",
      artist: newLuminaire["Artiste / Dates"] || "",
      year: newLuminaire["Année"] || "",
      period: newLuminaire["Période"] || "",
      type: newLuminaire["Type"] || "",
      specialty: newLuminaire["Spécialité"] || "",
      collaboration: newLuminaire["Collaboration / Œuvre"] || "",
    }

    setLuminaires((prev) => [adaptedLuminaire, ...prev])
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400 mb-4" />
          <p className="text-lg text-gray-600">Chargement des luminaires...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-serif text-gray-900 mb-2">Luminaires ({filteredLuminaires.length})</h1>
            <p className="text-gray-600">Collection de luminaires design</p>
          </div>

          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <CSVExportButton data={filteredLuminaires} filename="luminaires" />

            <RoleGuard allowedRoles={["admin", "editor"]}>
              <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </RoleGuard>

            <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")}>
                <Grid className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}>
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Message pour les utilisateurs "free" */}
        {userData?.role === "free" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="flex items-center">
              <span className="mr-2">ℹ️</span>
              <span>
                Vous utilisez un compte gratuit. Seuls 10% des luminaires sont affichés. Passez à Premium pour voir
                toute la collection.
              </span>
            </p>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher..." />

            <DropdownFilter
              value={selectedDesigner}
              onChange={setSelectedDesigner}
              options={designers}
              placeholder="Designer"
            />

            <DropdownFilter
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              options={periods}
              placeholder="Période"
            />

            <DropdownFilter value={selectedType} onChange={setSelectedType} options={types} placeholder="Type" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <RangeSlider value={yearRange} onChange={setYearRange} min={1900} max={2024} step={1} label="Années" />
            </div>

            <div className="md:col-span-1">
              <SortSelector
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: "name-asc", label: "Nom A→Z" },
                  { value: "name-desc", label: "Nom Z→A" },
                  { value: "year-asc", label: "Année ↑" },
                  { value: "year-desc", label: "Année ↓" },
                  { value: "artist-asc", label: "Artiste A→Z" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Grille des luminaires */}
        {displayedLuminaires.length === 0 && !isLoading ? (
          <div className="text-center py-16">
            <p className="text-lg text-gray-600">Aucun luminaire trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <>
            <GalleryGrid items={displayedLuminaires} viewMode={viewMode} onItemUpdate={updateLuminaire} />

            {/* Indicateur de chargement */}
            {hasMore && (
              <div ref={ref} className="text-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-gray-600">Chargement...</span>
                  </div>
                )}
              </div>
            )}

            {!hasMore && displayedLuminaires.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Tous les luminaires ont été chargés</p>
              </div>
            )}
          </>
        )}

        {/* Modal d'ajout */}
        <LuminaireFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={addLuminaire} />
      </div>
    </div>
  )
}
