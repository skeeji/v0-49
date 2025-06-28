"use client"

import { useState, useEffect, useCallback } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { SortSelector } from "@/components/SortSelector"
import { RangeSlider } from "@/components/RangeSlider"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { CSVExportButton } from "@/components/CSVExportButton"
import { useAuth } from "@/contexts/AuthContext"

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [filteredLuminaires, setFilteredLuminaires] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Filtres
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedMaterial, setSelectedMaterial] = useState("")
  const [yearRange, setYearRange] = useState([1800, 2024])
  const [priceRange, setPriceRange] = useState([0, 100000])
  const [sortBy, setSortBy] = useState("nom")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { user } = useAuth()

  const ITEMS_PER_PAGE = 50

  // Fonction pour charger les luminaires avec pagination
  const loadLuminaires = useCallback(
    async (pageNum = 1, resetList = false) => {
      if (pageNum === 1) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: ITEMS_PER_PAGE.toString(),
          search: searchTerm,
          designer: selectedDesigner,
          periode: selectedPeriod,
          material: selectedMaterial,
          yearMin: yearRange[0].toString(),
          yearMax: yearRange[1].toString(),
          priceMin: priceRange[0].toString(),
          priceMax: priceRange[1].toString(),
          sortBy: sortBy,
        })

        console.log(`🔍 Chargement page ${pageNum} avec filtres:`, Object.fromEntries(params))

        const response = await fetch(`/api/luminaires?${params}`)
        const data = await response.json()

        console.log("📊 Données reçues:", data)

        if (data.success) {
          const adaptedLuminaires = data.luminaires.map((lum: any) => ({
            ...lum,
            id: lum._id,
            image: lum["Nom du fichier"] ? `/api/images/filename/${lum["Nom du fichier"]}` : null,
            filename: lum["Nom du fichier"] || lum.filename || "",
            artist: lum.designer,
            year: lum.annee,
            name: lum.nom,
          }))

          if (resetList || pageNum === 1) {
            setLuminaires(adaptedLuminaires)
            setFilteredLuminaires(adaptedLuminaires)
          } else {
            setLuminaires((prev) => [...prev, ...adaptedLuminaires])
            setFilteredLuminaires((prev) => [...prev, ...adaptedLuminaires])
          }

          setTotalCount(data.pagination?.total || 0)
          setHasMore(data.pagination?.hasMore || false)

          console.log(`📊 ${adaptedLuminaires.length} luminaires chargés depuis MongoDB (page ${pageNum})`)
          console.log(`📊 Total dans la base: ${data.pagination?.total}`)
        }
      } catch (error) {
        console.error("❌ Erreur chargement luminaires:", error)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [searchTerm, selectedDesigner, selectedPeriod, selectedMaterial, yearRange, priceRange, sortBy],
  )

  // Charger les données initiales
  useEffect(() => {
    setPage(1)
    loadLuminaires(1, true)
  }, [loadLuminaires])

  // Scroll infini
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000 &&
        hasMore &&
        !isLoadingMore &&
        !isLoading
      ) {
        const nextPage = page + 1
        setPage(nextPage)
        loadLuminaires(nextPage, false)
      }
    }

    const throttledHandleScroll = throttle(handleScroll, 200)
    window.addEventListener("scroll", throttledHandleScroll)
    return () => window.removeEventListener("scroll", throttledHandleScroll)
  }, [hasMore, isLoadingMore, isLoading, page, loadLuminaires])

  // Fonction throttle
  function throttle(func: Function, limit: number) {
    let inThrottle: boolean
    return function (this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  // Reset de la pagination lors des changements de filtres
  useEffect(() => {
    setPage(1)
    setHasMore(true)
  }, [searchTerm, selectedDesigner, selectedPeriod, selectedMaterial, yearRange, priceRange, sortBy])

  const handleItemUpdate = (id: string, updates: any) => {
    setLuminaires((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
    setFilteredLuminaires((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const handleNewLuminaire = (newLuminaire: any) => {
    const adaptedLuminaire = {
      ...newLuminaire,
      id: newLuminaire._id,
      image: newLuminaire["Nom du fichier"] ? `/api/images/filename/${newLuminaire["Nom du fichier"]}` : null,
      filename: newLuminaire["Nom du fichier"] || "",
      artist: newLuminaire.designer,
      year: newLuminaire.annee,
      name: newLuminaire.nom,
    }

    setLuminaires((prev) => [adaptedLuminaire, ...prev])
    setFilteredLuminaires((prev) => [adaptedLuminaire, ...prev])
    setTotalCount((prev) => prev + 1)
  }

  // Obtenir les options uniques pour les filtres
  const designers = [...new Set(luminaires.map((item) => item.artist).filter(Boolean))].sort()
  const periods = [...new Set(luminaires.map((item) => item.year).filter(Boolean))].sort()
  const materials = [...new Set(luminaires.map((item) => item.materiaux).filter(Boolean))].sort()

  if (isLoading) {
    return <div className="text-center py-8">Chargement des luminaires...</div>
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-playfair text-dark mb-2">Collection Luminaires</h1>
            <p className="text-gray-600">
              {totalCount} luminaire{totalCount > 1 ? "s" : ""} dans la collection
            </p>
          </div>

          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            <CSVExportButton data={luminaires} filename="luminaires-collection" />
            {user?.role === "admin" && (
              <Button onClick={() => setIsModalOpen(true)} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un luminaire
              </Button>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Rechercher un luminaire..."
              className="lg:col-span-2"
            />
            <DropdownFilter
              label="Designer"
              value={selectedDesigner}
              onChange={setSelectedDesigner}
              options={designers}
              placeholder="Tous les designers"
            />
            <SortSelector value={sortBy} onChange={setSortBy} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DropdownFilter
              label="Période"
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              options={periods}
              placeholder="Toutes les périodes"
            />
            <DropdownFilter
              label="Matériau"
              value={selectedMaterial}
              onChange={setSelectedMaterial}
              options={materials}
              placeholder="Tous les matériaux"
            />
            <div className="space-y-4">
              <RangeSlider label="Année" min={1800} max={2024} value={yearRange} onChange={setYearRange} />
              <RangeSlider
                label="Prix estimé (€)"
                min={0}
                max={100000}
                step={1000}
                value={priceRange}
                onChange={setPriceRange}
              />
            </div>
          </div>
        </div>

        {/* Grille des luminaires */}
        <GalleryGrid
          items={filteredLuminaires}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onItemUpdate={handleItemUpdate}
          showPagination={false}
        />

        {/* Indicateurs de chargement */}
        {isLoadingMore && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">Chargement de plus de luminaires...</p>
          </div>
        )}

        {!hasMore && filteredLuminaires.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">Vous avez vu tous les luminaires de la collection !</p>
          </div>
        )}

        {filteredLuminaires.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun luminaire trouvé avec ces critères.</p>
          </div>
        )}
      </div>

      {/* Modal d'ajout */}
      <LuminaireFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleNewLuminaire} />
    </div>
  )
}
