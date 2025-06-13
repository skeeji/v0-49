"use client"

import { useState, useEffect, useCallback } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { CSVExportButton } from "@/components/CSVExportButton"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Eye } from "lucide-react"
import { Lightbox } from "@/components/Lightbox"
import { Grid, List } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { LoginModal } from "@/components/LoginModal"

export default function LuminairesPage() {
  const [allLuminaires, setAllLuminaires] = useState([]) // Tous les luminaires
  const [filteredLuminaires, setFilteredLuminaires] = useState([]) // Après filtrage
  const [displayedLuminaires, setDisplayedLuminaires] = useState([]) // Affichés avec pagination
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [yearRange, setYearRange] = useState([1900, 2025])
  const [minYear, setMinYear] = useState(1900)
  const [maxYear, setMaxYear] = useState(2025)
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showFavorites, setShowFavorites] = useState(false)
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [designers, setDesigners] = useState<string[]>([])
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filtersActive, setFiltersActive] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const searchParams = useSearchParams()
  const itemsPerPage = 50 // Augmenté pour charger plus d'éléments
  const [favorites, setFavorites] = useState<string[]>([])
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const { user, userData } = useAuth()

  // Charger TOUS les luminaires depuis localStorage
  useEffect(() => {
    const storedLuminaires = localStorage.getItem("luminaires")
    if (storedLuminaires) {
      const data = JSON.parse(storedLuminaires)
      console.log(`📊 ${data.length} luminaires chargés depuis localStorage`)
      setAllLuminaires(data)

      // Par défaut, afficher tous les luminaires sans filtres
      setFilteredLuminaires(data)

      // Pour les utilisateurs "free", limiter à 10% des résultats
      if (userData?.role === "free") {
        const limitedData = data.slice(0, Math.max(Math.floor(data.length * 0.1), 10))
        setDisplayedLuminaires(limitedData)
        setHasMore(false)
      } else {
        setDisplayedLuminaires(data.slice(0, itemsPerPage))
        setHasMore(data.length > itemsPerPage)
      }

      // Extraire les designers
      const uniqueDesigners = [...new Set(data.map((item: any) => item.artist))].filter(Boolean)
      setDesigners(uniqueDesigners)

      // Déterminer la plage d'années disponible
      const years = data.map((item: any) => Number.parseInt(item.year)).filter((year) => !isNaN(year) && year > 0)
      if (years.length > 0) {
        const min = Math.max(1000, Math.min(...years))
        const max = Math.min(2025, Math.max(...years))
        setMinYear(min)
        setMaxYear(max)
        setYearRange([min, max])
      }
    }

    // Charger les favoris depuis localStorage
    const storedFavorites = localStorage.getItem("favorites")
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites))
    }
  }, [userData])

  // Gérer le highlight depuis les paramètres d'URL
  useEffect(() => {
    const highlight = searchParams.get("highlight")
    const period = searchParams.get("period")

    if (highlight) {
      setHighlightedId(highlight)

      setTimeout(() => {
        const element = document.getElementById(`luminaire-${highlight}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
          element.classList.add("ring-4", "ring-orange", "ring-opacity-50")

          setTimeout(() => {
            element.classList.remove("ring-4", "ring-orange", "ring-opacity-50")
            setHighlightedId(null)
          }, 3000)
        }
      }, 500)
    }

    if (period) {
      setSearchTerm(period)
      setFiltersActive(true)
    }
  }, [searchParams])

  // Filtrer les luminaires quand les critères changent
  useEffect(() => {
    if (allLuminaires.length === 0) return

    // Vérifier si des filtres sont actifs
    const isFilterActive =
      searchTerm !== "" ||
      selectedDesigner !== "" ||
      showFavorites ||
      yearRange[0] !== minYear ||
      yearRange[1] !== maxYear

    setFiltersActive(isFilterActive)

    // Si aucun filtre n'est actif, afficher tous les luminaires
    if (!isFilterActive) {
      console.log("🔍 Aucun filtre actif, affichage de tous les luminaires")
      setFilteredLuminaires(allLuminaires)
      setPage(1)

      // Pour les utilisateurs "free", limiter à 10% des résultats
      if (userData?.role === "free") {
        const limitedData = allLuminaires.slice(0, Math.max(Math.floor(allLuminaires.length * 0.1), 10))
        setDisplayedLuminaires(limitedData)
        setHasMore(false)
      } else {
        setHasMore(allLuminaires.length > itemsPerPage)
        setDisplayedLuminaires(allLuminaires.slice(0, itemsPerPage))
      }
      return
    }

    console.log(`🔍 Filtrage de ${allLuminaires.length} luminaires...`)
    let filtered = [...allLuminaires]

    // Recherche textuelle
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        Object.values(item).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Filtre par année
    filtered = filtered.filter((item) => {
      const year = Number.parseInt(item.year) || 0
      return year >= yearRange[0] && year <= yearRange[1]
    })

    // Filtre par designer
    if (selectedDesigner && selectedDesigner !== "all") {
      filtered = filtered.filter((item) => item.artist === selectedDesigner)
    }

    // Filtre favoris
    if (showFavorites) {
      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
      filtered = filtered.filter((item) => favorites.includes(item.id))
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "year-desc":
          return (Number.parseInt(b.year) || 0) - (Number.parseInt(a.year) || 0)
        case "year-asc":
          return (Number.parseInt(a.year) || 0) - (Number.parseInt(b.year) || 0)
        default:
          return 0
      }
    })

    console.log(`✅ ${filtered.length} luminaires après filtrage`)
    setFilteredLuminaires(filtered)
    setPage(1)

    // Pour les utilisateurs "free", limiter à 10% des résultats
    if (userData?.role === "free") {
      const limitedData = filtered.slice(0, Math.max(Math.floor(filtered.length * 0.1), 10))
      setDisplayedLuminaires(limitedData)
      setHasMore(false)
    } else {
      setHasMore(filtered.length > itemsPerPage)
      const firstPage = filtered.slice(0, itemsPerPage)
      setDisplayedLuminaires(firstPage)
      console.log(`📄 ${firstPage.length} luminaires affichés (page 1)`)
    }
  }, [allLuminaires, searchTerm, sortBy, yearRange, selectedDesigner, showFavorites, minYear, maxYear, userData])

  // Fonction de chargement de plus d'éléments
  const loadMore = useCallback(() => {
    // Les utilisateurs "free" ne peuvent pas charger plus d'éléments
    if (userData?.role === "free") return

    if (isLoading || !hasMore) return

    setIsLoading(true)
    const nextPage = page + 1
    const startIndex = page * itemsPerPage
    const endIndex = nextPage * itemsPerPage
    const newItems = filteredLuminaires.slice(startIndex, endIndex)

    console.log(`📄 Chargement page ${nextPage}: ${newItems.length} nouveaux éléments`)

    setTimeout(() => {
      setDisplayedLuminaires((prev) => {
        const updated = [...prev, ...newItems]
        console.log(`📊 Total affiché: ${updated.length}/${filteredLuminaires.length}`)
        return updated
      })
      setPage(nextPage)
      setHasMore(endIndex < filteredLuminaires.length)
      setIsLoading(false)
    }, 300)
  }, [page, filteredLuminaires, isLoading, hasMore, itemsPerPage, userData])

  // Scroll infini
  useEffect(() => {
    // Les utilisateurs "free" ne peuvent pas utiliser le scroll infini
    if (userData?.role === "free") return

    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMore()
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loadMore, userData])

  const addLuminaire = (newLuminaire: any) => {
    // Seuls les admins peuvent ajouter des luminaires
    if (userData?.role !== "admin") {
      setShowLoginModal(true)
      return
    }

    const luminaireWithId = {
      ...newLuminaire,
      id: `manual_${Date.now()}`,
    }

    const updated = [...allLuminaires, luminaireWithId]
    setAllLuminaires(updated)
    localStorage.setItem("luminaires", JSON.stringify(updated))
    setShowAddModal(false)
  }

  const handleItemUpdate = (id: string, updates: any) => {
    // Seuls les admins peuvent modifier des luminaires
    if (userData?.role !== "admin") return

    const updated = allLuminaires.map((item) => (item.id === id ? { ...item, ...updates } : item))
    setAllLuminaires(updated)
    localStorage.setItem("luminaires", JSON.stringify(updated))
  }

  const resetFilters = () => {
    setSearchTerm("")
    setYearRange([minYear, maxYear])
    setSelectedDesigner("")
    setShowFavorites(false)
    setSortBy("name-asc")
  }

  const toggleFavorite = (id: string) => {
    let updatedFavorites = [...favorites]

    if (favorites.includes(id)) {
      updatedFavorites = favorites.filter((favId) => favId !== id)
    } else {
      updatedFavorites.push(id)
    }

    setFavorites(updatedFavorites)
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites))
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <h1 className="text-4xl font-playfair text-dark mb-4 lg:mb-0">Luminaires ({filteredLuminaires.length})</h1>

          <div className="flex items-center gap-4">
            {/* Seuls les admins peuvent ajouter des luminaires */}
            {userData?.role === "admin" && (
              <Button onClick={() => setShowAddModal(true)} className="bg-orange hover:bg-orange/90">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un luminaire
              </Button>
            )}

            {/* Seuls les admins peuvent exporter des données */}
            {userData?.role === "admin" && <CSVExportButton data={allLuminaires} />}

            <FavoriteToggleButton isActive={showFavorites} onClick={() => setShowFavorites(!showFavorites)} />
          </div>
        </div>

        {/* Message pour les utilisateurs "free" */}
        {userData?.role === "free" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="flex items-center">
              <span className="mr-2">ℹ️</span>
              <span>
                Vous utilisez un compte gratuit. Seuls 10% des luminaires sont affichés.
                <Link href="#" className="ml-1 underline font-medium">
                  Passez à Premium
                </Link>{" "}
                pour voir tous les luminaires.
              </span>
            </p>
          </div>
        )}

        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg">Filtres et tri</h3>
            {filtersActive && (
              <Button onClick={resetFilters} variant="outline" size="sm">
                Réinitialiser les filtres
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />

            <SortSelector
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "name-asc", label: "A → Z" },
                { value: "name-desc", label: "Z → A" },
                { value: "year-desc", label: "Année ↓" },
                { value: "year-asc", label: "Année ↑" },
              ]}
            />

            <DropdownFilter
              value={selectedDesigner}
              onChange={setSelectedDesigner}
              options={designers.map((designer) => ({ value: designer, label: designer }))}
              placeholder="Tous les designers"
            />

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <RangeSlider min={minYear} max={maxYear} value={yearRange} onChange={setYearRange} label="Période" />

          {filtersActive && (
            <div className="mt-4 p-2 bg-orange/10 rounded-lg text-sm text-orange">
              ⚠️ Filtres actifs - {filteredLuminaires.length} luminaires sur {allLuminaires.length} affichés
              {userData?.role === "free" && (
                <span className="ml-2">
                  (limité à{" "}
                  {Math.min(displayedLuminaires.length, Math.max(Math.floor(filteredLuminaires.length * 0.1), 10))}{" "}
                  résultats)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Affichage des luminaires selon le mode */}
        {viewMode === "grid" ? (
          <GalleryGrid items={displayedLuminaires} viewMode={viewMode} onItemUpdate={handleItemUpdate} columns={8} />
        ) : (
          <div className="space-y-2">
            {displayedLuminaires.map((item) => (
              <div key={item.id} id={`luminaire-${item.id}`} className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-4">
                  <Link
                    href={`/luminaires/${item.id}`}
                    className="w-16 h-16 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  >
                    <Image
                      src={item.image || "/placeholder.svg?height=100&width=100"}
                      alt={item.name || "Luminaire"}
                      fill
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link href={`/luminaires/${item.id}`}>
                      <h3 className="text-base font-playfair text-dark hover:text-orange cursor-pointer truncate">
                        {item.name || "Nom du luminaire"}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-600 truncate">{item.artist || "Artiste non renseigné"}</p>
                    <p className="text-xs text-gray-500">{item.year || "Année inconnue"}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <FavoriteToggleButton
                      isActive={favorites.includes(item.id)}
                      onClick={() => toggleFavorite(item.id)}
                    />
                    <Button
                      onClick={() => setLightboxImage(item.image)}
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
          </div>
        )}

        {/* Indicateur de chargement */}
        {isLoading && (
          <div className="text-center mt-8">
            <div className="inline-flex items-center px-4 py-2 bg-orange/10 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange mr-2"></div>
              <span className="text-orange">Chargement...</span>
            </div>
          </div>
        )}

        {/* Message fin de liste */}
        {!hasMore && displayedLuminaires.length > 0 && (
          <div className="text-center mt-8 py-4">
            <p className="text-gray-500">
              {userData?.role === "free" ? (
                <>
                  ⚠️ Affichage limité à {displayedLuminaires.length} luminaires
                  <Link href="#" className="ml-1 text-orange hover:underline">
                    Passez à Premium
                  </Link>{" "}
                  pour voir tous les luminaires.
                </>
              ) : (
                <>✅ Tous les luminaires ont été chargés ({displayedLuminaires.length} au total)</>
              )}
            </p>
          </div>
        )}

        {/* Message aucun résultat */}
        {filteredLuminaires.length === 0 && allLuminaires.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucun luminaire trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
            <Button onClick={resetFilters} className="mt-4 bg-orange">
              Réinitialiser les filtres
            </Button>
          </div>
        )}

        {/* Modal d'ajout */}
        <LuminaireFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={addLuminaire} />

        {/* Modal de connexion */}
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </div>
    </div>
  )
}
