"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { GalleryGrid } from "@/components/GalleryGrid"
import { SearchBar } from "@/components/SearchBar"
import { DropdownFilter } from "@/components/DropdownFilter"
import { RangeSlider } from "@/components/RangeSlider"
import { Button } from "@/components/ui/button"
import { Grid, List, Plus } from "lucide-react"
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
            console.log("✅ Favoris chargés:", data.favorites)
          }
        } catch (error) {
          console.error("❌ Erreur chargement favoris:", error)
        }
      }
    }

    loadFavorites()
  }, [user?.email])

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
          sortField,
          sortDirection,
        })

        if (sliderModifiedRef.current && yearRangeRef.current.length === 2) {
          params.append("yearMin", yearRangeRef.current[0].toString())
          params.append("yearMax", yearRangeRef.current[1].toString())
        }

        if (selectedCategorie && selectedCategorie !== "all") {
          params.append("categorie", selectedCategorie)
        }

        if (selectedMateriau && selectedMateriau !== "all") {
          params.append("materiau", selectedMateriau)
        }

        console.log("🔍 Paramètres de requête:", params.toString())

        const response = await fetch(`/api/luminaires?${params}`)
        const data = await response.json()

        if (data.success) {
          if (append && page > 1) {
            const existingIds = new Set(luminaires.map((l) => l._id))
            const newLuminaires = data.luminaires.filter((l: any) => !existingIds.has(l._id))

            console.log(
              `📊 Page ${page}: ${data.luminaires.length} luminaires reçus, ${newLuminaires.length} nouveaux ajoutés`,
            )

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
        console.error("❌ Erreur chargement:", err)
        setError(err.message)
        toast.error("Erreur lors du chargement des luminaires")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [searchTerm, selectedCategorie, selectedMateriau, sortField, sortDirection, luminaires],
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
      console.log(`🔄 Chargement page ${nextPage}`)
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
    console.log(`✅ Filtre chronologique activé par l'utilisateur: ${newRange[0]} - ${newRange[1]}`)
    setYearRange(newRange)
    setSliderModified(true)
    setCurrentPage(1)
    loadLuminaires(1, false)
  }

  const freeUserLimit = useMemo(() => {
    if (!user || userData?.role === "free") {
      return Math.ceil(totalItems * 0.1)
    }
    return totalItems
  }, [user, userData, totalItems])

  const displayedLuminaires = useMemo(() => {
    if (showFavorites) {
      console.log("🔍 Mode favoris actif, favoris:", favorites)
      console.log("📦 Tous les luminaires:", allLuminaires.length)

      const favoriteItems = allLuminaires.filter((item) => {
        const itemId = String(item._id || item.id || "")
        const isFavorite = favorites.includes(itemId)
        if (isFavorite) {
          console.log("✅ Favori trouvé:", item.nom || item["Nom luminaire"])
        }
        return isFavorite
      })

      console.log("❤️ Favoris trouvés:", favoriteItems.length)

      const uniqueFavorites = favoriteItems.filter(
        (item, index, self) => index === self.findIndex((t) => String(t._id || t.id) === String(item._id || item.id)),
      )
      return uniqueFavorites
    }
    return luminaires
  }, [luminaires, allLuminaires, showFavorites, favorites])

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-gray-900 mb-2">Luminaires</h1>
          <p className="text-gray-600">
            {totalItems > 0 ? `${displayedLuminaires.length}/${totalItems} luminaires` : "Aucun luminaire trouvé"}
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

          {user && userData?.role !== "free" && (
            <Button
              onClick={() => setShowFavorites(!showFavorites)}
              variant={showFavorites ? "default" : "outline"}
              style={showFavorites ? { backgroundColor: "#f2d895", color: "#000" } : {}}
              className="hover:opacity-90"
            >
              ❤️ Favoris ({favorites.length})
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

      {(!user || userData?.role === "free") && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-sm" style={{ color: "#d4a574" }}>
          <p className="flex items-center font-serif">
            <span className="mr-2">ℹ️</span>
            <span>
              {!user ? "Connectez-vous" : "Vous utilisez un compte gratuit"}. Seuls 10% des luminaires sont accessibles
              ({freeUserLimit} luminaires).
              <Link href="/pricing" className="ml-1 underline font-medium">
                Passez à Premium
              </Link>{" "}
              pour accéder à toute la collection.
            </span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />

        <DropdownFilter
          label="Catégorie"
          value={selectedCategorie}
          onChange={setSelectedCategorie}
          options={filterOptions.categories}
        />

        <DropdownFilter
          label="Matériaux"
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
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="nom-asc">Nom A-Z</option>
          <option value="nom-desc">Nom Z-A</option>
          <option value="designer-asc">Designer A-Z</option>
          <option value="designer-desc">Designer Z-A</option>
          <option value="annee-asc">Année croissante</option>
          <option value="annee-desc">Année décroissante</option>
        </select>
      </div>

      <div className="mb-8">
        <RangeSlider
          min={yearBounds.min}
          max={yearBounds.max}
          value={yearRange}
          onValueCommit={handleYearRangeChange}
        />
        {sliderModified && (
          <div className="mt-2 text-sm" style={{ color: "#d4a574" }}>
            Filtre actif: {yearRange[0]} - {yearRange[1]}
            <button
              onClick={() => {
                setYearRange([yearBounds.min, yearBounds.max])
                setSliderModified(false)
              }}
              className="ml-2 underline hover:no-underline"
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
      />

      {loadingMore && !showFavorites && (
        <div className="text-center mt-8">
          <div className="inline-flex items-center px-4 py-2 bg-orange-100 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
            <span className="text-orange-500">Chargement de plus de luminaires...</span>
          </div>
        </div>
      )}

      {!hasMore && luminaires.length > 0 && !showFavorites && (
        <div className="text-center mt-8 py-4">
          <p className="text-gray-500">
            ✅ Tous les luminaires ont été chargés ({luminaires.length} sur {totalItems} total)
          </p>
        </div>
      )}

      {displayedLuminaires.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">{showFavorites ? "Aucun favori trouvé" : "Aucun luminaire trouvé"}</p>
          <p className="text-gray-400 text-sm mt-2">
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
