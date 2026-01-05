"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SearchBar } from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Loader2, Plus, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import LuminaireFormModal from "@/components/LuminaireFormModal"
import MobileFooter from "@/components/MobileFooter" // Import MobileFooter component

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [allLuminaires, setAllLuminaires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [columns, setColumns] = useState(6) // Default columns
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategorie, setSelectedCategorie] = useState("")
  const [selectedMateriau, setSelectedMateriau] = useState("")
  const [yearRange, setYearRange] = useState<number[]>([1900, 2024]) // Initialize yearRange with full range (no filter by default)
  const [sliderModified, setSliderModified] = useState(false)
  const [sortField, setSortField] = useState("nom")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalDatabase, setTotalDatabase] = useState(9007)
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

      // Mise à jour optimiste de l'UI
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
          // Rollback en cas d'erreur
          setFavorites((prev) => (isFavorite ? [...prev, luminaireId] : prev.filter((id) => id !== luminaireId)))
          toast.error("Erreur lors de la mise à jour des favoris")
        }
      } catch (error) {
        console.error("❌ Erreur toggle favori:", error)
        // Rollback en cas d'erreur
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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setColumns(2)
      } else if (window.innerWidth >= 768 && columns === 2) {
        setColumns(6)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [columns])

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

  const [yearBounds, setYearBounds] = useState({ min: 1900, max: 2024 })

  useEffect(() => {
    async function fetchYearBounds() {
      try {
        const response = await fetch("/api/luminaires/stats")
        const result = await response.json()

        if (result.success && result.data.yearRange) {
          const min = result.data.yearRange.min
          const max = result.data.yearRange.max
          setYearBounds({ min, max })
          setYearRange([min, max])
          console.log("[v0] Year bounds set:", { min, max })
        }

        if (result.data.totalCount) {
          setTotalDatabase(result.data.totalCount)
        }
      } catch (error) {
        console.error("[v0] Error fetching year bounds:", error)
      }
    }

    fetchYearBounds()
  }, [])

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Number(e.target.value)
    if (newMin <= yearRange[1]) {
      setYearRange([newMin, yearRange[1]])
    }
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Number(e.target.value)
    if (newMax >= yearRange[0]) {
      setYearRange([yearRange[0], newMax])
    }
  }

  const handleSliderRelease = () => {
    setSliderModified(true)
    setCurrentPage(1)
  }

  useEffect(() => {
    if (sliderModified) {
      setCurrentPage(1)
      loadLuminaires(1, false)
    }
  }, [sliderModified, yearRange])

  const filteredLuminaires = useMemo(() => {
    let result = [...luminaires]

    if (sliderModified && yearRange.length === 2) {
      console.log("[v0] Filtering by year range:", yearRange)
      result = result.filter((luminaire) => {
        const yearField = luminaire.annee || luminaire["Année"] || ""
        const yearMatch = yearField.match(/\b(1[0-9]{3}|20[0-9]{2})\b/)
        if (yearMatch) {
          const year = Number.parseInt(yearMatch[0])
          return year >= yearRange[0] && year <= yearRange[1]
        }
        return false
      })
      console.log("[v0] Filtered luminaires count:", result.length)
    }

    return result
  }, [luminaires, yearRange, sliderModified])

  const pathname = usePathname()
  const [initialFiltersSet, setInitialFiltersSet] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && !initialFiltersSet) {
      const params = new URLSearchParams(window.location.search)
      const designerParam = params.get("designer")
      const periodParam = params.get("period")
      const yearMinParam = params.get("yearMin")
      const yearMaxParam = params.get("yearMax")

      if (designerParam) {
        setSearchTerm(designerParam)
      }

      if (yearMinParam && yearMaxParam) {
        const min = Number.parseInt(yearMinParam)
        const max = Number.parseInt(yearMaxParam)
        if (!isNaN(min) && !isNaN(max)) {
          setYearRange([min, max])
          setSliderModified(true)
        }
      }

      setInitialFiltersSet(true)
    }
  }, [initialFiltersSet])

  const isPremium = userData?.role === "premium" || userData?.role === "admin"
  const freeUserLimit = Math.ceil(totalDatabase * 0.1) // 10% of total database

  const displayedLuminaires = showFavorites ? luminaires.filter((lum) => favorites.includes(lum._id)) : luminaires

  if (loading && luminaires.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] pb-20">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400 mb-4" />
            <p className="text-gray-600">Chargement des luminaires...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8] pb-20">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-serif text-gray-900 mb-1 text-center md:text-left">
          Luminaires{" "}
          <span className="text-gray-500">
            ({totalItems}/{totalDatabase})
          </span>
        </h1>

        {!isPremium && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">✨</div>
              <div className="flex-1">
                <h3 className="font-serif text-base font-medium text-gray-900 mb-1">
                  Accès limité - Collection découverte
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Vous voyez <span className="font-semibold">{freeUserLimit} luminaires</span> sur{" "}
                  <span className="font-semibold">{totalDatabase}</span> disponibles. Passez à Premium pour explorer
                  toute notre collection sans restriction.
                </p>
                <Link href="/pricing">
                  <button className="px-4 py-2 bg-[#8b7355] text-white text-sm font-medium rounded-lg hover:bg-[#75614a] transition-colors">
                    Découvrir Premium →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Heart className={`w-4 h-4 ${showFavorites ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-sm">Favoris ({favorites.length})</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-4 mb-6">
          <div className="flex-1">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />
          </div>

          <select
            value={selectedCategorie || "all"}
            onChange={(e) => setSelectedCategorie(e.target.value === "all" ? "" : e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="all">Toutes les catégories</option>
            {filterOptions.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedMateriau || "all"}
            onChange={(e) => setSelectedMateriau(e.target.value === "all" ? "" : e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les matériaux</option>
            {filterOptions.materiaux.map((mat) => (
              <option key={mat} value={mat}>
                {mat}
              </option>
            ))}
          </select>

          <select
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split("-")
              setSortField(field)
              setSortDirection(dir as "asc" | "desc")
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="nom-asc">Nom A-Z</option>
            <option value="nom-desc">Nom Z-A</option>
            <option value="annee-asc">Année croissante</option>
            <option value="annee-desc">Année décroissante</option>
          </select>
        </div>

        <div className="md:hidden mb-6 space-y-4">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un luminaire..." />

          <div className="grid grid-cols-3 gap-2">
            <select
              value={selectedCategorie || "all"}
              onChange={(e) => setSelectedCategorie(e.target.value === "all" ? "" : e.target.value)}
              className="px-2 py-2 border border-gray-300 rounded-lg text-xs bg-white"
            >
              <option value="all">Catégories</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={selectedMateriau || "all"}
              onChange={(e) => setSelectedMateriau(e.target.value === "all" ? "" : e.target.value)}
              className="px-2 py-2 border border-gray-300 rounded-lg text-xs bg-white"
            >
              <option value="all">Matériaux</option>
              {filterOptions.materiaux.map((mat) => (
                <option key={mat} value={mat}>
                  {mat}
                </option>
              ))}
            </select>

            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split("-")
                setSortField(field)
                setSortDirection(dir as "asc" | "desc")
              }}
              className="px-2 py-2 border border-gray-300 rounded-lg text-xs bg-white"
            >
              <option value="nom-asc">A-Z</option>
              <option value="nom-desc">Z-A</option>
            </select>
          </div>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 rounded-full w-14 h-14 shadow-lg text-white"
            style={{ backgroundColor: "#8b7355" }}
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}

        {viewMode === "grid" ? (
          <div
            className={`grid gap-4 ${
              columns === 2
                ? "grid-cols-2"
                : columns === 3
                  ? "grid-cols-2 md:grid-cols-3"
                  : columns === 4
                    ? "grid-cols-2 md:grid-cols-4"
                    : "grid-cols-2 md:grid-cols-6"
            }`}
          >
            {displayedLuminaires.map((luminaire, index) => {
              const isAccessible = index < freeUserLimit || isPremium
              const LuminaireCard = isAccessible ? Link : "div"

              return (
                <LuminaireCard
                  key={luminaire._id}
                  href={isAccessible ? `/luminaires/${luminaire._id}` : undefined}
                  className={`flex flex-col h-full ${isAccessible ? "" : "opacity-40 cursor-not-allowed"}`}
                >
                  <div className="aspect-square relative bg-white overflow-hidden flex-shrink-0">
                    {luminaire.filename ? (
                      <Image
                        src={`/api/images/filename/${luminaire.filename}`}
                        alt={luminaire["Nom luminaire"] || "Luminaire"}
                        fill
                        className="object-cover"
                        sizes={columns === 6 ? "16vw" : columns === 4 ? "25vw" : columns === 3 ? "33vw" : "50vw"}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-4xl">🏮</div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-serif text-sm font-medium text-gray-900 mb-1 line-clamp-2 flex-1">
                      {luminaire["Nom luminaire"] || "Sans nom"}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {luminaire["Artiste / Dates"]?.split(",")[0] || "Artiste inconnu"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{luminaire.annee || luminaire["Année"] || ""}</p>

                    {!isAccessible && (
                      <div className="mt-2 text-center text-xs text-gray-400 font-medium">Premium requis</div>
                    )}
                  </div>
                </LuminaireCard>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedLuminaires.map((luminaire, index) => {
              const isAccessible = index < freeUserLimit || isPremium
              const LuminaireCard = isAccessible ? Link : "div"

              return (
                <LuminaireCard
                  key={luminaire._id}
                  href={isAccessible ? `/luminaires/${luminaire._id}` : undefined}
                  className={`flex items-center gap-4 bg-white rounded-lg p-4 hover:shadow-md transition-shadow ${isAccessible ? "" : "opacity-40 cursor-not-allowed"}`}
                >
                  <div className="w-24 h-24 relative bg-white rounded-lg overflow-hidden flex-shrink-0">
                    {luminaire.filename ? (
                      <Image
                        src={`/api/images/filename/${luminaire.filename}`}
                        alt={luminaire["Nom luminaire"] || "Luminaire"}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                        <div className="text-3xl">🏮</div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-base font-medium text-gray-900 mb-1 truncate">
                      {luminaire["Nom luminaire"] || "Sans nom"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">{luminaire["Artiste / Dates"] || "Artisan"}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {luminaire.annee && <span>{luminaire.annee}</span>}
                      {luminaire.Catégorie && <span>• {luminaire.Catégorie}</span>}
                    </div>
                  </div>
                </LuminaireCard>
              )
            })}
          </div>
        )}

        {loadingMore && !showFavorites && (
          <div className="text-center mt-8">
            <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-lg">
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-600" />
              <span className="text-gray-600 text-sm">Chargement...</span>
            </div>
          </div>
        )}

        {displayedLuminaires.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{showFavorites ? "Aucun favori trouvé" : "Aucun luminaire trouvé"}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <LuminaireFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateLuminaire}
        />
      )}

      <MobileFooter />
    </div>
  )
}
