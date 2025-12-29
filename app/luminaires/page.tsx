"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SearchBar } from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Search, SlidersHorizontal, Home, Users, Grid3x3, Mail, User } from "lucide-react"

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

  if (loading && luminaires.length === 0) {
    return (
      <div className="min-h-screen bg-white pb-20">
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
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" className="p-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-xl font-serif text-gray-900 font-medium">Luminaires - Collection</h1>
          <button className="p-2">
            <Search className="w-6 h-6 text-gray-900" />
          </button>
        </div>

        {/* Search and filter bar */}
        <div className="px-4 pb-4 space-y-3">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search luminaires or designers..." />

          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm w-full justify-center">
            <SlidersHorizontal className="w-4 h-4" />
            Filter & Sort
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          {displayedLuminaires.map((luminaire, index) => {
            const isAccessible = !user || userData?.role === "free" ? index < freeUserLimit : true
            const luminaireId = String(luminaire._id || luminaire.id || "")
            const isFavorite = favorites.includes(luminaireId)

            const LuminaireCard = isAccessible ? Link : "div"

            return (
              <LuminaireCard
                key={luminaireId || index}
                {...(isAccessible ? { href: `/luminaires/${luminaireId}` } : {})}
                className="block"
              >
                <div
                  className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow ${
                    isAccessible ? "hover:shadow-lg" : "opacity-50 grayscale cursor-not-allowed"
                  }`}
                >
                  <div className="p-4">
                    <div className="bg-[#f5f1e8] rounded-2xl aspect-square mb-3 p-8 flex items-center justify-center shadow-sm">
                      <div className="relative w-full h-full">
                        <Image
                          src={
                            luminaire.imageId
                              ? `/api/images/${luminaire.imageId}`
                              : luminaire.filename
                                ? `/api/images/filename/${luminaire.filename}`
                                : luminaire["Nom du fichier"]
                                  ? `/api/images/filename/${luminaire["Nom du fichier"]}`
                                  : "/placeholder.svg"
                          }
                          alt={luminaire["Nom luminaire"] || luminaire.nom || "Luminaire"}
                          fill
                          unoptimized
                          className="object-contain drop-shadow-md"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg"
                          }}
                        />
                      </div>
                    </div>

                    {/* Luminaire info */}
                    <h3 className="font-serif text-base font-medium text-gray-900 mb-1 leading-tight">
                      {luminaire["Nom luminaire"] || luminaire.nom || "Sans nom"}
                    </h3>
                    <p className="text-xs text-gray-600 mb-1">
                      {luminaire["Artiste / Dates"] || luminaire.designer || "Designer inconnu"}
                      {(luminaire.annee || luminaire.year) && `, ${luminaire.annee || luminaire.year}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {luminaire["Matériaux"] ||
                        (Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join(", ") : luminaire.materiaux) ||
                        luminaire.categorie ||
                        luminaire["Catégorie"] ||
                        "Material description"}
                    </p>
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
