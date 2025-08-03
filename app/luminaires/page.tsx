"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { SortSelector } from "@/components/SortSelector"
import { RangeSlider } from "@/components/RangeSlider"
import { CSVExportButton } from "@/components/CSVExportButton"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function LuminairesPage() {
  const [allLuminaires, setAllLuminaires] = useState([])
  const [filteredLuminaires, setFilteredLuminaires] = useState([])
  const [displayedLuminaires, setDisplayedLuminaires] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedMaterial, setSelectedMaterial] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [selectedSigned, setSelectedSigned] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [yearRange, setYearRange] = useState([1000, 2025])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const { user, userData } = useAuth()

  const ITEMS_PER_PAGE = 50

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  })

  // Calculer la limite pour les comptes gratuits
  const freeUserLimit =
    !user || userData?.role === "free" ? Math.ceil(filteredLuminaires.length * 0.1) : filteredLuminaires.length

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const response = await fetch("/api/luminaires?limit=10000")
        const data = await response.json()

        if (data.success) {
          console.log(`📊 ${data.luminaires.length} luminaires chargés`)

          const adaptedLuminaires = data.luminaires.map((lum: any) => ({
            ...lum,
            id: lum._id,
            image: lum["Nom du fichier"] ? `/api/images/filename/${lum["Nom du fichier"]}` : null,
            year: lum.annee || null,
            artist: lum["Artiste / Dates"] || "",
            name: lum["Nom luminaire"] || "Sans nom",
            period: lum["Période / Style"] || "",
            materials: lum.materiaux || lum.Matériaux || "",
            type: lum["Type / Typologie"] || "",
            signed: lum.signe || lum.Signé || "",
          }))

          setAllLuminaires(adaptedLuminaires)
          setFilteredLuminaires(adaptedLuminaires)
        }
      } catch (error) {
        console.error("❌ Erreur chargement données:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filtrer et trier
  useEffect(() => {
    let filtered = [...allLuminaires]

    if (searchTerm) {
      filtered = filtered.filter(
        (luminaire) =>
          luminaire.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          luminaire.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
          luminaire.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
          luminaire.materials.toLowerCase().includes(searchTerm.toLowerCase()) ||
          luminaire.type.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedDesigner) {
      filtered = filtered.filter((luminaire) => luminaire.artist.includes(selectedDesigner))
    }

    if (selectedPeriod) {
      filtered = filtered.filter((luminaire) => luminaire.period.includes(selectedPeriod))
    }

    if (selectedMaterial) {
      filtered = filtered.filter((luminaire) =>
        luminaire.materials.toLowerCase().includes(selectedMaterial.toLowerCase()),
      )
    }

    if (selectedType) {
      filtered = filtered.filter((luminaire) => luminaire.type.includes(selectedType))
    }

    if (selectedSigned) {
      filtered = filtered.filter((luminaire) => luminaire.signed.includes(selectedSigned))
    }

    // Filtrer par année
    filtered = filtered.filter((luminaire) => {
      if (!luminaire.year) return true
      return luminaire.year >= yearRange[0] && luminaire.year <= yearRange[1]
    })

    // Trier
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "year-asc":
          return (a.year || 0) - (b.year || 0)
        case "year-desc":
          return (b.year || 0) - (a.year || 0)
        case "artist-asc":
          return a.artist.localeCompare(b.artist)
        case "artist-desc":
          return b.artist.localeCompare(a.artist)
        default:
          return 0
      }
    })

    setFilteredLuminaires(filtered)
    setPage(0)
    setHasMore(true)
    setDisplayedLuminaires([])
  }, [
    allLuminaires,
    searchTerm,
    selectedDesigner,
    selectedPeriod,
    selectedMaterial,
    selectedType,
    selectedSigned,
    sortBy,
    yearRange,
  ])

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

  // Extraire les valeurs uniques pour les filtres
  const uniqueDesigners = [...new Set(allLuminaires.map((l) => l.artist).filter(Boolean))].sort()
  const uniquePeriods = [...new Set(allLuminaires.map((l) => l.period).filter(Boolean))].sort()
  const uniqueMaterials = [...new Set(allLuminaires.map((l) => l.materials).filter(Boolean))].sort()
  const uniqueTypes = [...new Set(allLuminaires.map((l) => l.type).filter(Boolean))].sort()
  const uniqueSigned = [...new Set(allLuminaires.map((l) => l.signed).filter(Boolean))].sort()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400 mb-4" />
          <p className="text-lg text-gray-600 font-serif">Chargement des luminaires...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-serif text-gray-900 mb-8">
          Luminaires ({displayedLuminaires.length}/{filteredLuminaires.length})
          {(!user || userData?.role === "free") && filteredLuminaires.length > 0 && (
            <span className="text-orange-600 text-2xl ml-2">({freeUserLimit} accessibles)</span>
          )}
        </h1>

        {/* Message pour les utilisateurs non connectés ou "free" */}
        {(!user || userData?.role === "free") && (
          <div
            className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-sm"
            style={{ color: "#d4a574" }}
          >
            <p className="flex items-center font-serif">
              <span className="mr-2">ℹ️</span>
              <span>
                {!user ? "Connectez-vous" : "Vous utilisez un compte gratuit"}. Seuls 10% des luminaires sont
                accessibles ({freeUserLimit} luminaires).
                <Link href="/pricing" className="ml-1 underline font-medium">
                  Passez à Premium
                </Link>{" "}
                pour accéder à toute la collection.
              </span>
            </p>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher..." />

            <DropdownFilter
              label="Designer"
              value={selectedDesigner}
              onChange={setSelectedDesigner}
              options={uniqueDesigners}
            />

            <DropdownFilter
              label="Période"
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              options={uniquePeriods}
            />

            <DropdownFilter
              label="Matériaux"
              value={selectedMaterial}
              onChange={setSelectedMaterial}
              options={uniqueMaterials}
            />

            <DropdownFilter label="Type" value={selectedType} onChange={setSelectedType} options={uniqueTypes} />

            <DropdownFilter label="Signé" value={selectedSigned} onChange={setSelectedSigned} options={uniqueSigned} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <RangeSlider
              label="Année"
              min={1000}
              max={2025}
              value={yearRange}
              onChange={setYearRange}
              formatValue={(value) => value.toString()}
            />

            <div className="flex items-center gap-4">
              <SortSelector value={sortBy} onChange={setSortBy} />
              <CSVExportButton />
            </div>
          </div>
        </div>

        {/* Grille des luminaires */}
        {displayedLuminaires.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg font-serif">Aucun luminaire trouvé</p>
            <p className="text-gray-400 text-sm mt-2 font-serif">Essayez de modifier vos filtres de recherche</p>
          </div>
        ) : (
          <>
            <GalleryGrid luminaires={displayedLuminaires} freeUserLimit={freeUserLimit} />

            {/* Indicateur de chargement */}
            {hasMore && (
              <div ref={ref} className="text-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-gray-600 font-serif">Chargement...</span>
                  </div>
                )}
              </div>
            )}

            {!hasMore && displayedLuminaires.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="font-serif">Tous les luminaires ont été chargés</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
