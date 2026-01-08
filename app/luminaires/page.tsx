"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { SearchBar } from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Loader2, Home, Users, Grid3x3, Mail, User, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import LuminaireFormModal from "@/components/LuminaireFormModal"
import MobileFooter from "@/components/MobileFooter"

export default function LuminairesPage() {
  const searchParams = useSearchParams()

  const [luminaires, setLuminaires] = useState<any[]>([])
  const [allLuminaires, setAllLuminaires] = useState<any[]>([])
  const [allLuminairesLoaded, setAllLuminairesLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [columns, setColumns] = useState(6)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategorie, setSelectedCategorie] = useState("")
  const [selectedMateriau, setSelectedMateriau] = useState("")
  const [yearRange, setYearRange] = useState<number[]>([1900, 2024])
  const [sliderModified, setSliderModified] = useState(false)
  const [sortField, setSortField] = useState("nom")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalDatabase, setTotalDatabase] = useState(9007)
  const [hasMore, setHasMore] = useState(true)
  const [showFavorites, setShowFavorites] = useState(false)

  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [displayOffset, setDisplayOffset] = useState(50)

  const yearRangeRef = useRef(yearRange)
  const sliderModifiedRef = useRef(sliderModified)

  useEffect(() => {
    yearRangeRef.current = yearRange
    sliderModifiedRef.current = sliderModified
  })

  useEffect(() => {
    const designer = searchParams.get("designer")
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")

    if (designer) {
      setSelectedDesigner(designer)
    }

    if (yearMin && yearMax) {
      const min = Number.parseInt(yearMin)
      const max = Number.parseInt(yearMax)
      if (!isNaN(min) && !isNaN(max)) {
        setYearRange([min, max])
        setSliderModified(true)
      }
    }
  }, [searchParams])

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
        setAllLuminairesLoaded(true)
      }
    } catch (err) {
      console.error("Erreur chargement données globales:", err)
    }
  }, [])

  const fetchLuminaires = useCallback(
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
    [searchTerm, sortField, sortDirection],
  )

  useEffect(() => {
    loadAllLuminaires()
  }, [loadAllLuminaires])

  useEffect(() => {
    setCurrentPage(1)
    fetchLuminaires(1, false)
  }, [searchTerm, selectedCategorie, selectedMateriau, sortField, sortDirection])

  const loadMore = useCallback(() => {
    const hasUrlFilters = selectedDesigner || sliderModified

    if (hasUrlFilters) {
      // For filtered results, increase display offset
      setDisplayOffset((prev) => prev + 50)
    } else {
      // Normal API pagination
      if (!loadingMore && hasMore && !loading && !showFavorites) {
        const nextPage = currentPage + 1
        setCurrentPage(nextPage)
        fetchLuminaires(nextPage, true)
      }
    }
  }, [loadingMore, hasMore, loading, currentPage, fetchLuminaires, showFavorites, selectedDesigner, sliderModified])

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
          fetchLuminaires(1, false)
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
    [fetchLuminaires, loadAllLuminaires],
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

          const yearMin = searchParams.get("yearMin")
          const yearMax = searchParams.get("yearMax")
          if (!yearMin && !yearMax) {
            setYearRange([min, max])
          }
        }

        if (result.data.totalCount) {
          setTotalDatabase(result.data.totalCount)
        }
      } catch (error) {
        console.error("Error fetching year bounds:", error)
      }
    }

    fetchYearBounds()
  }, [searchParams])

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
    setDisplayOffset(50)
  }

  const filteredLuminaires = useMemo(() => {
    // Don't filter until allLuminaires is loaded
    if (!allLuminairesLoaded || allLuminaires.length === 0) {
      return []
    }

    let filtered = allLuminaires

    // Filter by designer
    if (selectedDesigner) {
      filtered = filtered.filter((lum) => {
        const artistField = lum["Artiste / Dates"] || lum.designer || ""
        return artistField.includes(selectedDesigner)
      })
    }

    // Filter by year using 'Année' column with improved extraction
    if (sliderModified) {
      filtered = filtered.filter((lum) => {
        // Use 'Année' column as specified
        const anneeValue = lum["Année"] || lum.annee || lum.year

        if (!anneeValue) return false

        // Extract 4-digit year from text (e.g., "Vers 1750" -> 1750)
        const yearMatch = String(anneeValue).match(/\b(1[0-9]{3}|20[0-9]{2})\b/)

        if (!yearMatch) return false

        const numYear = Number.parseInt(yearMatch[0])

        if (isNaN(numYear) || numYear < 1000 || numYear > 2100) return false

        return numYear >= yearRange[0] && numYear <= yearRange[1]
      })
    }

    return filtered
  }, [allLuminaires, allLuminairesLoaded, yearRange, sliderModified, selectedDesigner])

  const isPremium = userData?.role === "admin" || userData?.isPremium
  const freeUserLimit = isPremium ? filteredLuminaires.length : Math.floor(totalDatabase * 0.1)

  const displayedLuminaires = useMemo(() => {
    if (showFavorites) {
      const favoriteItems = allLuminaires.filter((item) => {
        const itemId = String(item._id || item.id || "")
        return favorites.includes(itemId)
      })
      return favoriteItems
    }

    // If filters are active, slice filtered results for pagination
    const hasFilters = selectedDesigner || sliderModified
    if (hasFilters) {
      return filteredLuminaires.slice(0, displayOffset)
    }

    // Otherwise use normal luminaires from API
    return luminaires
  }, [
    filteredLuminaires,
    luminaires,
    showFavorites,
    favorites,
    allLuminaires,
    selectedDesigner,
    sliderModified,
    displayOffset,
  ])

  useEffect(() => {
    setDisplayOffset(50)
  }, [selectedDesigner, sliderModified, yearRange])

  const pathname = usePathname()

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

  const hasUrlFilters = searchParams.get("designer") || searchParams.get("yearMin")
  if (hasUrlFilters && !allLuminairesLoaded) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] pb-20">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400 mb-4" />
            <p className="text-gray-600">Chargement des filtres...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8] pb-20">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-serif text-gray-900">
            Luminaires
            <span className="text-gray-500 ml-2">
              ({displayedLuminaires.length}/
              {selectedDesigner || sliderModified ? filteredLuminaires.length : totalItems})
            </span>
          </h2>
        </div>

        {!user || (userData?.role !== "premium" && userData?.role !== "admin") ? (
          <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Accès limité - Vous voyez 10% de la collection</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Passez à Premium pour voir tous les luminaires sans restriction !
                </p>
                <Link href="/pricing">
                  <button
                    className="text-sm font-medium px-4 py-2 rounded-lg text-white hover:bg-[#75614a] transition-colors"
                    style={{ backgroundColor: "#8b7355" }}
                  >
                    Découvrir Premium →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <div className="md:flex-[2]">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Rechercher un luminaire..."
              className="bg-white w-full"
            />
          </div>

          <div className="flex gap-3 md:flex-[3] flex-wrap">
            <select
              value={selectedCategorie}
              onChange={(e) => {
                setSelectedCategorie(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm flex-1 min-w-[150px]"
            >
              <option value="">Toutes les catégories</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={selectedMateriau}
              onChange={(e) => {
                setSelectedMateriau(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm flex-1 min-w-[150px]"
            >
              <option value="">Tous les matériaux</option>
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
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm flex-1 min-w-[150px]"
            >
              <option value="nom-asc">Nom A-Z</option>
              <option value="nom-desc">Nom Z-A</option>
              <option value="annee-asc">Année croissante</option>
              <option value="annee-desc">Année décroissante</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl p-6 mb-6 bg-transparent">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Période chronologique</h2>
            {sliderModified && (
              <button
                onClick={() => {
                  setYearRange([yearBounds.min, yearBounds.max])
                  setSliderModified(false)
                  setCurrentPage(1)
                }}
                className="text-sm text-[#8b7355] hover:underline"
              >
                -
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
            <span>Min: {yearRange[0]}</span>
            <span className="font-semibold">Intervalle: {yearRange[1] - yearRange[0]} ans</span>
            <span>Max: {yearRange[1]}</span>
          </div>

          <style jsx>{`
            .dual-range-slider {
              position: relative;
              width: 100%;
              height: 40px;
            }

            .slider-track {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              width: 100%;
              height: 4px;
              background: #e5e7eb;
              border-radius: 2px;
            }

            .slider-range {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              height: 4px;
              background: #8b7355;
              border-radius: 2px;
              pointer-events: none;
            }

            .slider-input {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              width: 100%;
              height: 4px;
              -webkit-appearance: none;
              appearance: none;
              background: transparent;
              pointer-events: none;
              margin: 0;
            }

            .slider-input::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #8b7355;
              cursor: pointer;
              pointer-events: auto;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
              position: relative;
              z-index: 3;
            }

            .slider-input::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #8b7355;
              cursor: pointer;
              pointer-events: auto;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
              border: none;
              position: relative;
              z-index: 3;
            }

            .slider-input::-webkit-slider-thumb:hover {
              background: #75614a;
            }

            .slider-input::-moz-range-thumb:hover {
              background: #75614a;
            }

            .min-slider {
              z-index: 2;
            }

            .max-slider {
              z-index: 4;
            }
          `}</style>

          <div className="dual-range-slider">
            <div className="slider-track" />
            <div
              className="slider-range"
              style={{
                left: `${((yearRange[0] - yearBounds.min) / (yearBounds.max - yearBounds.min)) * 100}%`,
                right: `${100 - ((yearRange[1] - yearBounds.min) / (yearBounds.max - yearBounds.min)) * 100}%`,
              }}
            />

            <input
              type="range"
              className="slider-input min-slider"
              min={yearBounds.min}
              max={yearBounds.max}
              value={yearRange[0]}
              onChange={handleMinChange}
              onMouseUp={handleSliderRelease}
              onTouchEnd={handleSliderRelease}
            />

            <input
              type="range"
              className="slider-input max-slider"
              min={yearBounds.min}
              max={yearBounds.max}
              value={yearRange[1]}
              onChange={handleMaxChange}
              onMouseUp={handleSliderRelease}
              onTouchEnd={handleSliderRelease}
            />
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
            const isAccessible = index < freeUserLimit
            const LuminaireCard = isAccessible ? Link : "div"

            return (
              <LuminaireCard key={luminaire._id} {...(isAccessible ? { href: `/luminaires/${luminaire._id}` } : {})}>
                <div
                  className={`bg-white rounded-xl overflow-hidden transition-shadow border border-gray-200 flex flex-col h-full ${
                    isAccessible ? "hover:shadow-lg cursor-pointer" : "opacity-50 grayscale cursor-not-allowed"
                  }`}
                >
                  <div className="aspect-square relative bg-white overflow-hidden flex-shrink-0">
                    {luminaire.filename ? (
                      <Image
                        src={`/api/images/filename/${luminaire.filename}`}
                        alt={luminaire["Nom luminaire"] || "Luminaire"}
                        fill
                        className="object-cover"
                        sizes={columns === 6 ? "16vw" : columns === 4 ? "25vw" : columns === 3 ? "33vw" : "50vw"}
                        loading="lazy"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-4xl">🏮</div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-serif text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      {luminaire["Nom luminaire"] || "Sans nom"}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-1">
                      {luminaire["Artiste / Dates"]?.split(",")[0] || "Artiste inconnu"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {luminaire["Année"] || luminaire.annee || luminaire.year || ""}
                    </p>

                    {!isAccessible && (
                      <div className="mt-2 text-center text-xs text-gray-400 font-medium">Premium requis</div>
                    )}
                  </div>
                </div>
              </LuminaireCard>
            )
          })}
        </div>

        {(selectedDesigner || sliderModified) && displayOffset < filteredLuminaires.length && (
          <div className="text-center mt-8">
            <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-lg">
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-600" />
              <span className="text-gray-600 text-sm">Chargement...</span>
            </div>
          </div>
        )}

        {loadingMore && !showFavorites && !(selectedDesigner || sliderModified) && (
          <div className="text-center mt-8">
            <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-lg">
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-600" />
              <span className="text-gray-600 text-sm">Chargement...</span>
            </div>
          </div>
        )}

        {displayedLuminaires.length === 0 && !loading && allLuminairesLoaded && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{showFavorites ? "Aucun favori trouvé" : "Aucun luminaire trouvé"}</p>
          </div>
        )}
      </div>

      <LuminaireFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateLuminaire} />

      <nav className="bottom-nav">
        <Link href="/" className={`bottom-nav-item ${pathname === "/" ? "active" : ""}`}>
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link href="/designers" className={`bottom-nav-item ${pathname.startsWith("/designers") ? "active" : ""}`}>
          <Users className="w-5 h-5" />
          <span>Designers</span>
        </Link>
        <Link href="/luminaires" className={`bottom-nav-item ${pathname.startsWith("/luminaires") ? "active" : ""}`}>
          <Grid3x3 className="w-5 h-5" />
          <span>Collection</span>
        </Link>
        <Link href="/recherche" className={`bottom-nav-item ${pathname === "/recherche" ? "active" : ""}`}>
          <Mail className="w-5 h-5" />
          <span>Inquire</span>
        </Link>
        <Link href="/pricing" className={`bottom-nav-item ${pathname === "/pricing" ? "active" : ""}`}>
          <User className="w-5 h-5" />
          <span>Account</span>
        </Link>
      </nav>

      <MobileFooter />
    </div>
  )
}
