"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SearchBar } from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Loader2, Home, Users, Grid3x3, Mail, User, Plus, Heart, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import LuminaireFormModal from "@/components/LuminaireFormModal"
import { LayoutGrid } from "lucide-react"
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
  const [hasMore, setHasMore] = useState(true)
  const [showFavorites, setShowFavorites] = useState(false)
  const [totalDatabaseCount, setTotalDatabaseCount] = useState(0)

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
      if (loading) return

      try {
        setLoading(true)
        console.log("[v0] Loading luminaires, page:", page)

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "50",
          search: searchTerm,
          categorie: selectedCategorie || "",
          materiau: selectedMateriau || "",
          sortField: sortField,
          sortDirection: sortDirection,
        })

        if (sliderModifiedRef.current) {
          params.set("yearMin", yearRangeRef.current[0].toString())
          params.set("yearMax", yearRangeRef.current[1].toString())
        }

        const response = await fetch(`/api/luminaires?${params}`)
        const result = await response.json()

        if (result.success) {
          const newLuminaires = result.luminaires || []

          if (append) {
            setLuminaires((prev) => [...prev, ...newLuminaires])
          } else {
            setLuminaires(newLuminaires)
          }

          setTotalItems(result.pagination.total)
          setHasMore(result.pagination.hasMore)
          setCurrentPage(page)
          if (result.pagination.totalDatabase) {
            setTotalDatabaseCount(result.pagination.totalDatabase)
          }
        }
      } catch (error) {
        console.error("[v0] Error loading luminaires:", error)
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
          console.log("[v0] Year bounds set:", { min, max })
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

  const freeUserLimit = !user || (user && !isAdmin) ? Math.floor(totalDatabaseCount * 0.1) : Number.POSITIVE_INFINITY

  const displayedLuminaires = useMemo(() => {
    if (showFavorites) {
      const favoriteItems = allLuminaires.filter((item) => {
        const itemId = String(item._id || item.id || "")
        return favorites.includes(itemId)
      })
      return favoriteItems
    }
    return filteredLuminaires
  }, [filteredLuminaires, allLuminaires, showFavorites, favorites])

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

  return (
    <div className="min-h-screen bg-[#f5f1e8] pb-20">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-serif text-gray-900">
            Luminaires
            <span className="text-gray-500 ml-2">
              ({displayedLuminaires.length}/{totalItems})
            </span>
          </h2>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Heart className={`w-4 h-4 ${showFavorites ? "fill-red-500 text-red-500" : ""}`} />
              <span className="text-sm">Favoris ({favorites.length})</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-gray-200" : "bg-gray-100"}`}
                aria-label="Vue grille"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-gray-200" : "bg-gray-100"}`}
                aria-label="Vue liste"
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {viewMode === "grid" && (
              <select
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={2}>2 colonnes</option>
                <option value={3}>3 colonnes</option>
                <option value={4}>4 colonnes</option>
                <option value={6}>6 colonnes</option>
              </select>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-4">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Rechercher un luminaire..."
            className="bg-white"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <select
            value={selectedCategorie}
            onChange={(e) => {
              setSelectedCategorie(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
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
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
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
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
          >
            <option value="nom-asc">Nom A-Z</option>
            <option value="nom-desc">Nom Z-A</option>
            <option value="annee-asc">Année croissante</option>
            <option value="annee-desc">Année décroissante</option>
          </select>
        </div>

        {/* Slider section */}
        <div className="rounded-xl p-6 mb-6 bg-transparent">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Période chronologique</label>
            {sliderModified && (
              <button
                onClick={() => {
                  setYearRange([yearBounds.min, yearBounds.max])
                  setSliderModified(false)
                  setCurrentPage(1)
                  loadLuminaires(1, false)
                }}
                className="text-xs text-[#8b7355] hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-2 text-sm text-gray-700">
            <span className="font-medium">{yearRange[0]}</span>
            <span className="text-gray-500">{yearRange[1] - yearRange[0] + 1} années</span>
            <span className="font-medium">{yearRange[1]}</span>
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

        {/* Grid or List view */}
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
                  className={`bg-white rounded-xl overflow-hidden transition-shadow border border-gray-200 ${
                    isAccessible ? "hover:shadow-lg cursor-pointer" : "opacity-50 grayscale cursor-not-allowed"
                  }`}
                >
                  <div className="aspect-square relative bg-white overflow-hidden">
                    {luminaire.filename ? (
                      <Image
                        src={`/api/images/filename/${luminaire.filename}`}
                        alt={luminaire["Nom luminaire"] || "Luminaire"}
                        fill
                        className="object-contain"
                        sizes={columns === 6 ? "16vw" : columns === 4 ? "25vw" : columns === 3 ? "33vw" : "50vw"}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-4xl">🏮</div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-serif text-sm font-medium text-gray-900 mb-1 line-clamp-2">
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
                </div>
              </LuminaireCard>
            )
          })}
        </div>

        {/* Loading indicator */}
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
