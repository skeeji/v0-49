"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SearchBar } from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Loader2, SlidersHorizontal, Home, Users, Grid3x3, Mail, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import LuminaireFormModal from "@/components/LuminaireFormModal"

export default function LuminairesPage() {
  const [luminaires, setLuminaires] = useState<any[]>([])
  const [allLuminaires, setAllLuminaires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [columns, setColumns] = useState(typeof window !== "undefined" && window.innerWidth >= 768 ? 6 : 2)
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
      const favoriteItems = allLuminaires.filter((item) => {
        const itemId = String(item._id || item.id || "")
        return favorites.includes(itemId)
      })
      return favoriteItems
    }
    return luminaires
  }, [luminaires, allLuminaires, showFavorites, favorites])

  const pathname = usePathname()

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && columns > 2) {
        setColumns(2)
      } else if (window.innerWidth >= 768 && columns === 2) {
        setColumns(6)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [columns])

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

          <div className="flex items-center gap-2">
            {/* Favorites button */}
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors ${
                showFavorites
                  ? "bg-[#f2d895] border-[#f2d895] text-gray-900"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>♥</span>
              <span>Favoris ({favorites.length})</span>
            </button>

            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-[#f2d895]" : "bg-white border border-gray-300"}`}
            >
              <Grid3x3 className="w-5 h-5 text-gray-900" />
            </button>

            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg ${viewMode === "list" ? "bg-[#f2d895]" : "bg-white border border-gray-300"}`}
            >
              <SlidersHorizontal className="w-5 h-5 text-gray-700" />
            </button>

            <select
              value={columns}
              onChange={(e) => setColumns(Number.parseInt(e.target.value))}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
            >
              <option value="2">2 colonnes</option>
              <option value="3">3 colonnes</option>
              <option value="4">4 colonnes</option>
              <option value="5">5 colonnes</option>
              <option value="6">6 colonnes</option>
            </select>
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

        <div className="rounded-xl p-6 mb-6 bg-transparent">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">Période chronologique</h3>
            <div className="text-sm text-gray-900 font-medium">
              {yearRange[0]} - {yearRange[1]}
            </div>
          </div>

          <div className="relative px-2">
            <style jsx>{`
              input[type="range"] {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 2px;
                background: transparent;
                outline: none;
              }
              input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                background: #8b7355;
                cursor: pointer;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                position: relative;
                z-index: 10;
              }
              input[type="range"]::-moz-range-thumb {
                width: 20px;
                height: 20px;
                background: #8b7355;
                cursor: pointer;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
            `}</style>

            <input
              type="range"
              min={yearBounds.min}
              max={yearBounds.max}
              value={yearRange[0]}
              onChange={(e) => {
                const newMin = Number.parseInt(e.target.value)
                if (newMin <= yearRange[1]) {
                  handleYearRangeChange([newMin, yearRange[1]])
                }
              }}
              className="absolute w-full h-2 bg-transparent appearance-none pointer-events-auto"
              style={{
                zIndex: yearRange[0] > yearBounds.min + (yearBounds.max - yearBounds.min) / 2 ? 5 : 3,
              }}
            />
            <input
              type="range"
              min={yearBounds.min}
              max={yearBounds.max}
              value={yearRange[1]}
              onChange={(e) => {
                const newMax = Number.parseInt(e.target.value)
                if (newMax >= yearRange[0]) {
                  handleYearRangeChange([yearRange[0], newMax])
                }
              }}
              className="absolute w-full h-2 bg-transparent appearance-none pointer-events-auto"
              style={{ zIndex: 4 }}
            />
            <div className="relative h-2 bg-gray-200 rounded-full">
              <div
                className="absolute h-full bg-[#8b7355] rounded-full"
                style={{
                  left: `${((yearRange[0] - yearBounds.min) / (yearBounds.max - yearBounds.min)) * 100}%`,
                  right: `${100 - ((yearRange[1] - yearBounds.min) / (yearBounds.max - yearBounds.min)) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>{yearBounds.min}</span>
            <span>{yearBounds.max}</span>
          </div>

          {sliderModified && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-900">
                Filtre actif: {yearRange[0]} - {yearRange[1]}
              </span>
              <button
                onClick={() => {
                  setYearRange([yearBounds.min, yearBounds.max])
                  setSliderModified(false)
                  setCurrentPage(1)
                  loadLuminaires(1, false)
                }}
                className="text-sm text-gray-900 hover:underline"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="mb-6">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#f2d895] text-gray-900 hover:bg-[#e6c77a] flex items-center gap-2"
            >
              <span>+</span>
              Créer un luminaire
            </Button>
          </div>
        )}

        {/* Grid or List view */}
        {viewMode === "grid" ? (
          <div
            className={`grid gap-4 ${
              columns === 2
                ? "grid-cols-2"
                : columns === 3
                  ? "grid-cols-2 md:grid-cols-3"
                  : columns === 4
                    ? "grid-cols-2 md:grid-cols-4"
                    : columns === 5
                      ? "grid-cols-2 md:grid-cols-5"
                      : "grid-cols-2 md:grid-cols-6"
            }`}
          >
            {displayedLuminaires.map((luminaire) => {
              const itemId = String(luminaire._id || luminaire.id || "")

              return (
                <Link key={itemId} href={`/luminaires/${itemId}`} className="block">
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square relative bg-transparent">
                      {luminaire.filename ? (
                        <Image
                          src={`/api/images/filename/${luminaire.filename}`}
                          alt={luminaire["Nom luminaire"] || luminaire.nom || "Luminaire"}
                          fill
                          className="object-contain rounded-xl p-2"
                          unoptimized
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                            if (nextElement) {
                              nextElement.classList.remove("hidden")
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-full flex items-center justify-center text-gray-400 ${
                          luminaire.filename ? "hidden" : ""
                        }`}
                      >
                        <div className="text-5xl">🏮</div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        {luminaire["Nom luminaire"] || luminaire.nom || "Sans nom"}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {luminaire["Artiste / Dates"] || luminaire.designer || "Artiste inconnu"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {luminaire.annee || luminaire["Année"] || "Année inconnue"}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedLuminaires.map((item, index) => {
              const isAccessible = !user || userData?.role === "free" ? index < freeUserLimit : true
              const luminaireId = String(item._id || item.id || "")
              const isFavorite = favorites.includes(luminaireId)

              const LuminaireCard = isAccessible ? Link : "div"

              return (
                <LuminaireCard
                  key={luminaireId || index}
                  {...(isAccessible ? { href: `/luminaires/${luminaireId}` } : {})}
                  className="block"
                >
                  <div
                    className={`bg-white rounded-2xl overflow-hidden transition-shadow flex ${
                      isAccessible ? "hover:shadow-lg" : "opacity-50 grayscale cursor-not-allowed"
                    }`}
                  >
                    <div className="w-32 h-32 relative bg-gray-50 flex-shrink-0 rounded-2xl overflow-hidden">
                      {item.filename || item["Nom du fichier"] ? (
                        <Image
                          src={`/api/images/filename/${item.filename || item["Nom du fichier"]}`}
                          alt={String(item["Nom luminaire"] || item.nom || "Luminaire")}
                          fill
                          className="object-cover"
                          unoptimized
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=200&width=200"
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-4xl">🏮</div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-lg font-medium text-gray-900 mb-1">
                          {item["Nom luminaire"] || item.nom || "Sans nom"}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">
                          {item["Artiste / Dates"] || item.designer || "Artiste inconnu"}
                        </p>
                        <p className="text-xs text-gray-600">{item.annee || item["Année"] || "Année inconnue"}</p>
                      </div>

                      {isAccessible && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavorite(luminaireId)
                          }}
                          className="w-8 h-8 flex items-center justify-center"
                        >
                          <span className={`text-xl ${isFavorite ? "text-red-500" : "text-gray-400"}`}>♥</span>
                        </button>
                      )}
                    </div>
                  </div>
                </LuminaireCard>
              )
            })}
          </div>
        )}

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
    </div>
  )
}
