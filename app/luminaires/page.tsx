"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { Button } from "@/components/ui/button"
import { Grid, List, Plus, SlidersHorizontal } from "lucide-react"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import Link from "next/link"

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [allLuminaires, setAllLuminaires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [columns, setColumns] = useState(4)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategorie, setSelectedCategorie] = useState("")
  const [selectedMateriau, setSelectedMateriau] = useState("")
  const [yearRange, setYearRange] = useState<number[]>([])
  const [sliderModified, setSliderModified] = useState(false)
  const [sortField, setSortField] = useState("nom")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [showFavorites, setShowFavorites] = useState(false)

  const yearRangeRef = useRef(yearRange)
  const sliderModifiedRef = useRef(sliderModified)

  useEffect(() => {
    yearRangeRef.current = yearRange
    sliderModifiedRef.current = sliderModified
  })

  const { user, userData } = useAuth()
  const isAdmin = userData?.role === "admin"
  const [favorites, setFavorites] = useState<string[]>([])

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
          console.error("Erreur chargement favoris:", error)
        }
      } else {
        setFavorites([])
      }
    }

    loadFavorites()
  }, [user?.email])

  const toggleFavorite = useCallback(
    async (luminaireId: string) => {
      if (!user?.email) {
        toast.error("Vous devez être connecté pour gérer vos favoris")
        return
      }

      const isFavorite = favorites.includes(luminaireId)
      const action = isFavorite ? "remove" : "add"

      setFavorites((prev) => (isFavorite ? prev.filter((id) => id !== luminaireId) : [...prev, luminaireId]))

      try {
        const response = await fetch("/api/users/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            luminaireId,
            action,
          }),
        })

        const data = await response.json()

        if (!data.success) {
          setFavorites((prev) => (isFavorite ? [...prev, luminaireId] : prev.filter((id) => id !== luminaireId)))
          toast.error("Erreur lors de la mise à jour des favoris")
        }
      } catch (error) {
        console.error("Erreur toggle favori:", error)
        setFavorites((prev) => (isFavorite ? [...prev, luminaireId] : prev.filter((id) => id !== luminaireId)))
        toast.error("Erreur lors de la mise à jour des favoris")
      }
    },
    [user?.email, favorites],
  )

  const loadAllLuminaires = useCallback(async () => {
    try {
      const response = await fetch(`/api/luminaires?limit=10000&page=1`)
      const data = await response.json()
      if (data.success) {
        setAllLuminaires(data.luminaires)
      }
    } catch (err) {
      console.error("Erreur chargement données globales:", err)
    }
  }, [])

  const loadLuminaires = useCallback(
    async (page = 1, append = false, yearRangeOverride?: number[]) => {
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
          sortField,
          sortDirection,
        })

        const activeYearRange = yearRangeOverride || yearRangeRef.current
        if (sliderModifiedRef.current && activeYearRange.length === 2) {
          params.append("yearMin", activeYearRange[0].toString())
          params.append("yearMax", activeYearRange[1].toString())
        }

        if (selectedCategorie && selectedCategorie !== "all") {
          params.append("categorie", selectedCategorie)
        }

        if (selectedMateriau && selectedMateriau !== "all") {
          params.append("materiau", selectedMateriau)
        }

        const response = await fetch(`/api/luminaires?${params}`)
        const data = await response.json()

        if (data.success) {
          if (append && page > 1) {
            const existingIds = new Set(luminaires.map((l) => l._id))
            const newLuminaires = data.luminaires.filter((l: any) => !existingIds.has(l._id))

            if (newLuminaires.length > 0) {
              setLuminaires((prev) => [...prev, ...newLuminaires])
            }
          } else {
            setLuminaires(data.luminaires)
          }

          setHasMore(data.pagination?.hasMore || false)
          setTotalItems(data.pagination?.total || 0)
        } else {
          throw new Error(data.error || "Erreur lors du chargement")
        }
      } catch (err: any) {
        console.error("Erreur chargement:", err)
        setError(err.message)
        toast.error("Erreur lors du chargement des luminaires")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [searchTerm, selectedCategorie, selectedMateriau, sortField, sortDirection],
  )

  useEffect(() => {
    loadAllLuminaires()
  }, [loadAllLuminaires])

  useEffect(() => {
    setCurrentPage(1)
    loadLuminaires(1, false, yearRange)
  }, [searchTerm, selectedCategorie, selectedMateriau, sortField, sortDirection, sliderModified, yearRange])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading && !showFavorites) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadLuminaires(nextPage, true)
    }
  }, [loadingMore, hasMore, loading, currentPage, loadLuminaires, showFavorites])

  useEffect(() => {
    if (showFavorites) return

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
  }, [loadMore, showFavorites])

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
      console.error("Erreur mise à jour:", err)
      toast.error("Erreur lors de la mise à jour")
    }
  }, [])

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

        return data
      } catch (err: any) {
        console.error("Erreur création:", err)
        toast.error("Erreur lors de la création")
        return { success: false, error: err.message }
      }
    },
    [loadLuminaires, loadAllLuminaires],
  )

  const filterOptions = useMemo(() => {
    const categories = [...new Set(allLuminaires.map((l) => l.categorie || l["Catégorie"]).filter(Boolean))].sort()

    const materiaux = new Set<string>()
    allLuminaires.forEach((l) => {
      const matValue = l["Matériaux"] || (Array.isArray(l.materiaux) ? l.materiaux.join(", ") : l.materiaux) || ""

      if (typeof matValue === "string" && matValue.trim()) {
        matValue.split(",").forEach((mat) => {
          const cleanMat = mat.trim()
          if (cleanMat && cleanMat.length > 0) {
            materiaux.add(cleanMat)
          }
        })
      }
    })

    return {
      categories,
      materiaux: Array.from(materiaux).sort(),
    }
  }, [allLuminaires])

  const yearBounds = useMemo(() => {
    const years = allLuminaires
      .map((l) => {
        const year = l.annee || l.year
        const numYear = Number.parseInt(year)
        return !isNaN(numYear) ? numYear : null
      })
      .filter((year): year is number => year !== null)
      .sort((a, b) => a - b)

    if (years.length === 0) return { min: 1900, max: 2024 }

    return {
      min: years[0],
      max: years[years.length - 1],
    }
  }, [allLuminaires])

  useEffect(() => {
    if (allLuminaires.length > 0 && yearRange.length === 0) {
      setYearRange([yearBounds.min, yearBounds.max])
    }
  }, [yearBounds, allLuminaires.length, yearRange.length])

  const handleYearRangeChange = (newRange: number[]) => {
    setYearRange(newRange)
    setSliderModified(true)
    setCurrentPage(1)
    loadLuminaires(1, false, newRange)
  }

  const freeUserLimit = useMemo(() => {
    if (!user || userData?.role === "free") {
      return Math.ceil(totalItems * 0.1)
    }
    return totalItems
  }, [user, userData, totalItems])

  const displayedLuminaires = useMemo(() => {
    if (showFavorites) {
      const favoriteItems = allLuminaires.filter((item) => {
        const itemId = String(item._id || item.id || "")
        return favorites.includes(itemId)
      })
      return favoriteItems
    }
    return luminaires
  }, [luminaires, allLuminaires, showFavorites, favorites])

  if (loading && luminaires.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50">
        <div className="container-responsive py-16">
          <div className="flex items-center justify-center h-64">
            <div className="text-center animate-fade-in">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-muted border-t-accent mx-auto mb-6"></div>
              <p className="text-lg text-muted-foreground">Chargement de la collection...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && luminaires.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50">
        <div className="container-responsive py-16">
          <div className="text-center animate-fade-in">
            <p className="text-red-600 mb-6 text-lg">Erreur: {error}</p>
            <Button onClick={() => loadLuminaires(1, false)} size="lg" className="rounded-full">
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50">
      <div className="container-responsive py-8 md:py-12">
        <div className="flex flex-col gap-8 mb-12 animate-slide-up">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-foreground mb-3">Luminaires</h1>
              <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                {totalItems > 0
                  ? `Explorez notre collection de ${totalItems} luminaires d'exception`
                  : "Aucun luminaire trouvé"}
              </p>
              {displayedLuminaires.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Affichage de {displayedLuminaires.length} luminaire{displayedLuminaires.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <Button
                  onClick={() => setIsModalOpen(true)}
                  size="lg"
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Ajouter
                </Button>
              )}

              {user && userData?.role !== "free" && (
                <Button
                  onClick={() => setShowFavorites(!showFavorites)}
                  variant={showFavorites ? "default" : "outline"}
                  size="lg"
                  className="rounded-full shadow-lg"
                >
                  Favoris ({favorites.length})
                </Button>
              )}

              <div className="flex items-center gap-2 bg-card border border-border rounded-full p-1 shadow-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-full"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-full"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {viewMode === "grid" && (
                <select
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className="px-4 py-2 border border-border bg-card rounded-full text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
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

          {(!user || userData?.role === "free") && (
            <div className="glass-morphism rounded-2xl p-6 text-sm animate-fade-in">
              <p className="flex items-start gap-3 leading-relaxed">
                <span className="text-xl">ℹ️</span>
                <span className="text-foreground/80">
                  {!user ? "Connectez-vous" : "Vous utilisez un compte gratuit"}. Seuls 10% des luminaires sont
                  accessibles ({freeUserLimit} luminaires).
                  <Link href="/pricing" className="ml-2 underline font-medium text-accent hover:text-accent/80">
                    Passez à Premium
                  </Link>{" "}
                  pour accéder à toute la collection.
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="mb-8 animate-fade-in">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="mb-4 rounded-full shadow-md lg:hidden"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
          </Button>

          <div className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="glass-morphism rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Rechercher un luminaire..."
                  className="rounded-full"
                />

                <DropdownFilter
                  label="Toutes les catégories"
                  value={selectedCategorie}
                  onChange={setSelectedCategorie}
                  options={filterOptions.categories}
                  className="rounded-full"
                />

                <DropdownFilter
                  label="Tous les matériaux"
                  value={selectedMateriau}
                  onChange={setSelectedMateriau}
                  options={filterOptions.materiaux}
                  className="rounded-full"
                />

                <select
                  value={`${sortField}-${sortDirection}`}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split("-")
                    setSortField(field)
                    setSortDirection(direction as "asc" | "desc")
                  }}
                  className="px-4 py-2 border border-border bg-card rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="nom-asc">Nom A-Z</option>
                  <option value="nom-desc">Nom Z-A</option>
                  <option value="designer-asc">Designer A-Z</option>
                  <option value="designer-desc">Designer Z-A</option>
                  <option value="annee-asc">Année croissante</option>
                  <option value="annee-desc">Année décroissante</option>
                </select>
              </div>

              <div className="pt-4">
                <RangeSlider
                  min={yearBounds.min}
                  max={yearBounds.max}
                  value={yearRange}
                  onValueCommit={handleYearRangeChange}
                />
                {sliderModified && (
                  <div className="mt-3 text-sm text-accent flex items-center justify-between">
                    <span>
                      Filtre actif: {yearRange[0]} - {yearRange[1]}
                    </span>
                    <button
                      onClick={() => {
                        setYearRange([yearBounds.min, yearBounds.max])
                        setSliderModified(false)
                      }}
                      className="underline hover:no-underline font-medium"
                    >
                      Réinitialiser
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="animate-fade-in">
          <GalleryGrid
            items={displayedLuminaires}
            viewMode={viewMode}
            onItemUpdate={handleItemUpdate}
            columns={columns}
            freeUserLimit={freeUserLimit}
            isUserFree={!user || userData?.role === "free"}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        </div>

        {loadingMore && !showFavorites && (
          <div className="text-center mt-12 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-accent/10 rounded-full">
              <div className="animate-spin rounded-full h-5 w-5 border-3 border-accent/30 border-t-accent"></div>
              <span className="text-accent font-medium">Chargement...</span>
            </div>
          </div>
        )}

        {!hasMore && luminaires.length > 0 && !showFavorites && (
          <div className="text-center mt-12 py-6 animate-fade-in">
            <p className="text-muted-foreground">
              Tous les luminaires ont été chargés ({luminaires.length} sur {totalItems} total)
            </p>
          </div>
        )}

        {displayedLuminaires.length === 0 && !loading && (
          <div className="text-center py-24 animate-fade-in">
            <div className="max-w-md mx-auto">
              <p className="text-2xl text-foreground font-light mb-3">
                {showFavorites ? "Aucun favori trouvé" : "Aucun luminaire trouvé"}
              </p>
              <p className="text-muted-foreground">
                {showFavorites
                  ? "Ajoutez des luminaires à vos favoris"
                  : "Essayez de modifier vos critères de recherche"}
              </p>
            </div>
          </div>
        )}

        {isAdmin && (
          <LuminaireFormModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleCreateLuminaire}
          />
        )}
      </div>
    </div>
  )
}
