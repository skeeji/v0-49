"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { Button } from "@/components/ui/button"
import { Grid, List, Plus, Heart } from "lucide-react"
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
          console.error("❌ Erreur chargement favoris:", error)
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
        console.error("❌ Erreur toggle favori:", error)
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
      console.error("❌ Erreur chargement données globales:", err)
    }
  }, [])

  const loadLuminaires = useCallback(
    async (page = 1, append = false, yearRangeOverride?: number[]) => {
      try {
        console.log("[v0] Loading luminaires with params:", {
          page,
          append,
          yearRangeOverride,
          sliderModified: sliderModifiedRef.current,
        })

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

        const effectiveYearRange = yearRangeOverride || yearRangeRef.current

        if (sliderModifiedRef.current && effectiveYearRange.length === 2) {
          params.append("yearMin", effectiveYearRange[0].toString())
          params.append("yearMax", effectiveYearRange[1].toString())
          console.log("[v0] Applying year filter:", effectiveYearRange)
        }

        if (selectedCategorie && selectedCategorie !== "all") {
          params.append("categorie", selectedCategorie)
        }

        if (selectedMateriau && selectedMateriau !== "all") {
          params.append("materiau", selectedMateriau)
        }

        console.log("[v0] API URL:", `/api/luminaires?${params}`)
        const response = await fetch(`/api/luminaires?${params}`)
        const data = await response.json()

        if (data.success) {
          console.log("[v0] Received luminaires:", data.luminaires.length)

          if (append && page > 1) {
            setLuminaires((prev) => {
              const existingIds = new Set(prev.map((l) => l._id))
              const newLuminaires = data.luminaires.filter((l: any) => !existingIds.has(l._id))

              if (newLuminaires.length > 0) {
                return [...prev, ...newLuminaires]
              }
              return prev
            })
          } else {
            setLuminaires(data.luminaires)
          }

          setHasMore(data.pagination?.hasMore || false)
          setTotalItems(data.pagination?.total || 0)
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
    [searchTerm, selectedCategorie, selectedMateriau, sortField, sortDirection],
  )

  useEffect(() => {
    loadAllLuminaires()
  }, [loadAllLuminaires])

  useEffect(() => {
    setCurrentPage(1)
    loadLuminaires(1, false)
  }, [searchTerm, selectedCategorie, selectedMateriau, sortField, sortDirection, sliderModified])

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
      console.error("❌ Erreur mise à jour:", err)
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
        console.error("❌ Erreur création:", err)
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
    console.log("[v0] Year range changed:", newRange)
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
      <div className="container-responsive py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-beige-dark border-t-gold mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des luminaires...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && luminaires.length === 0) {
    return (
      <div className="container-responsive py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur: {error}</p>
          <Button onClick={() => loadLuminaires(1, false)} className="bg-gold hover:bg-gold-dark text-white">
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-2">Luminaires</h1>
          <p className="text-muted-foreground">
            {totalItems > 0 ? `${displayedLuminaires.length} résultats affichés` : "Aucun luminaire trouvé"}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 lg:mt-0 flex-wrap">
          {isAdmin && (
            <Button onClick={() => setIsModalOpen(true)} className="bg-gold hover:bg-gold-dark text-white rounded-lg">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          )}

          {user && userData?.role !== "free" && (
            <Button
              onClick={() => setShowFavorites(!showFavorites)}
              variant={showFavorites ? "default" : "outline"}
              className={`rounded-lg ${showFavorites ? "bg-gold hover:bg-gold-dark text-white" : "border-2 hover:border-gold hover:text-gold"}`}
            >
              <Heart className={`w-4 h-4 mr-2 ${showFavorites ? "fill-current" : ""}`} />
              Favoris ({favorites.length})
            </Button>
          )}

          <div className="flex items-center gap-2 border border-border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-gold hover:bg-gold-dark text-white" : ""}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-gold hover:bg-gold-dark text-white" : ""}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {viewMode === "grid" && (
            <select
              value={columns}
              onChange={(e) => setColumns(Number(e.target.value))}
              className="px-4 py-2 border-2 border-border rounded-lg text-sm bg-white hover:border-gold transition-colors"
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
        <div className="bg-beige border-2 border-gold/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-foreground flex items-start gap-2">
            <span className="text-gold font-semibold">ℹ️</span>
            <span>
              {!user ? "Connectez-vous" : "Vous utilisez un compte gratuit"}. Seuls 10% des luminaires sont accessibles
              ({freeUserLimit} luminaires).
              <Link href="/pricing" className="ml-1 text-gold font-semibold hover:underline">
                Passez à Premium →
              </Link>
            </span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />

        <DropdownFilter
          label="Toutes les catégories"
          value={selectedCategorie}
          onChange={setSelectedCategorie}
          options={filterOptions.categories}
        />

        <DropdownFilter
          label="Tous les matériaux"
          value={selectedMateriau}
          onChange={setSelectedMateriau}
          options={filterOptions.materiaux}
        />

        <select
          value={`${sortField}-${sortDirection}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split("-")
            setSortField(field)
            setSortDirection(direction as "asc" | "desc")
          }}
          className="px-4 py-2 border-2 border-border rounded-lg text-sm bg-white hover:border-gold transition-colors"
        >
          <option value="nom-asc">Nom A-Z</option>
          <option value="nom-desc">Nom Z-A</option>
          <option value="designer-asc">Designer A-Z</option>
          <option value="designer-desc">Designer Z-A</option>
          <option value="annee-asc">Année croissante</option>
          <option value="annee-desc">Année décroissante</option>
        </select>
      </div>

      <div className="mb-8 bg-white border border-border rounded-xl p-6">
        <RangeSlider
          min={yearBounds.min}
          max={yearBounds.max}
          value={yearRange}
          onValueCommit={handleYearRangeChange}
        />
        {sliderModified && (
          <div className="mt-3 text-sm text-gold flex items-center justify-between">
            <span>
              Filtre actif: {yearRange[0]} - {yearRange[1]}
            </span>
            <button
              onClick={() => {
                setYearRange([yearBounds.min, yearBounds.max])
                setSliderModified(false)
              }}
              className="text-gold hover:underline font-medium"
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>

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

      {loadingMore && !showFavorites && (
        <div className="text-center mt-8">
          <div className="inline-flex items-center px-6 py-3 bg-beige border border-gold/30 rounded-xl">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gold border-t-transparent mr-3"></div>
            <span className="text-gold font-medium">Chargement...</span>
          </div>
        </div>
      )}

      {!hasMore && luminaires.length > 0 && !showFavorites && (
        <div className="text-center mt-8 py-4">
          <p className="text-muted-foreground">
            Tous les luminaires ont été chargés ({luminaires.length} sur {totalItems} total)
          </p>
        </div>
      )}

      {displayedLuminaires.length === 0 && !loading && (
        <div className="text-center py-16 bg-beige rounded-xl">
          <p className="text-foreground text-lg font-medium mb-2">
            {showFavorites ? "Aucun favori trouvé" : "Aucun luminaire trouvé"}
          </p>
          <p className="text-muted-foreground text-sm">
            {showFavorites ? "Ajoutez des luminaires à vos favoris" : "Essayez de modifier vos critères de recherche"}
          </p>
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
  )
}
