"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SearchBar } from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, Home, Users, Grid3x3, Mail, User } from "lucide-react"

export default function DesignersPage() {
  const [allDesigners, setAllDesigners] = useState([])
  const [filteredDesigners, setFilteredDesigners] = useState([])
  const [displayedDesigners, setDisplayedDesigners] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [periodFilter, setPeriodFilter] = useState("")
  const { user, userData } = useAuth()
  const pathname = usePathname()

  const ITEMS_PER_PAGE = 50

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  })

  const freeUserLimit =
    !user || userData?.role === "free" ? Math.ceil(filteredDesigners.length * 0.1) : filteredDesigners.length

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const luminairesResponse = await fetch("/api/luminaires?limit=10000")
        const luminairesData = await luminairesResponse.json()

        if (luminairesData.success) {
          const designerGroups = luminairesData.luminaires.reduce((acc: any, luminaire: any) => {
            const designerName = luminaire["Artiste / Dates"] || luminaire.designer || "Designer inconnu"

            if (!acc[designerName]) {
              acc[designerName] = {
                name: designerName,
                count: 0,
                luminaires: [],
                image: luminaire.designerImageFilename ? `/api/images/filename/${luminaire.designerImageFilename}` : "",
                slug: encodeURIComponent(designerName),
                years: [],
              }
            }

            acc[designerName].count++

            if (luminaire.designerImageFilename && !acc[designerName].image) {
              acc[designerName].image = `/api/images/filename/${luminaire.designerImageFilename}`
            }

            let luminaireImageUrl = "/placeholder.svg"
            if (luminaire.imageId) {
              luminaireImageUrl = `/api/images/${luminaire.imageId}`
            } else if (luminaire.filename) {
              luminaireImageUrl = `/api/images/filename/${luminaire.filename}`
            } else if (luminaire["Nom du fichier"]) {
              luminaireImageUrl = `/api/images/filename/${luminaire["Nom du fichier"]}`
            }

            acc[designerName].luminaires.push({
              ...luminaire,
              image: luminaireImageUrl,
              name: luminaire["Nom luminaire"] || luminaire.nom || "Sans nom",
            })

            const artistDates = luminaire["Artiste / Dates"] || luminaire.designer || ""
            const yearMatches = artistDates.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g)
            if (yearMatches) {
              acc[designerName].years = [
                ...new Set([...acc[designerName].years, ...yearMatches.map((y) => Number.parseInt(y))]),
              ]
            }

            return acc
          }, {})

          try {
            const designersResponse = await fetch("/api/designers-data")
            const designersResult = await designersResponse.json()

            if (designersResult.success && designersResult.designers) {
              Object.keys(designerGroups).forEach((designerName) => {
                if (!designerGroups[designerName].image) {
                  const designerInfo = designersResult.designers.find(
                    (d: any) => d.Nom && d.Nom.toLowerCase().trim() === designerName.toLowerCase().trim(),
                  )

                  if (designerInfo && designerInfo.imagedesigner) {
                    designerGroups[designerName].image = `/api/images/filename/${designerInfo.imagedesigner}`
                  }
                }
              })
            }
          } catch (error) {
            console.error("❌ Erreur chargement données designers fallback:", error)
          }

          const designersArray = Object.values(designerGroups).sort((a: any, b: any) => a.name.localeCompare(b.name))

          setAllDesigners(designersArray)
          setFilteredDesigners(designersArray)
        }
      } catch (error) {
        console.error("❌ Erreur chargement données:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    let filtered = [...allDesigners]

    if (searchTerm) {
      filtered = filtered.filter((designer) => designer.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (periodFilter) {
      filtered = filtered.filter((designer) => {
        // Filtrer par période si nécessaire
        return true
      })
    }

    const uniqueDesigners = filtered.filter(
      (designer, index, self) => index === self.findIndex((d) => d.name === designer.name),
    )

    uniqueDesigners.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "year-asc":
          const minYearA = a.years.length > 0 ? Math.min(...a.years) : 9999
          const minYearB = b.years.length > 0 ? Math.min(...b.years) : 9999
          return minYearA - minYearB
        case "year-desc":
          const maxYearA = a.years.length > 0 ? Math.max(...a.years) : 0
          const maxYearB = b.years.length > 0 ? Math.max(...b.years) : 0
          return maxYearB - maxYearA
        default:
          return 0
      }
    })

    setFilteredDesigners(uniqueDesigners)
    setPage(0)
    setHasMore(true)
    setDisplayedDesigners([])
  }, [allDesigners, searchTerm, sortBy, periodFilter])

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    setTimeout(() => {
      const startIndex = page * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const newItems = filteredDesigners.slice(startIndex, endIndex)

      if (page === 0) {
        setDisplayedDesigners(newItems)
      } else {
        setDisplayedDesigners((prev) => [...prev, ...newItems])
      }

      setPage((prev) => prev + 1)
      setHasMore(endIndex < filteredDesigners.length)
      setIsLoadingMore(false)
    }, 300)
  }, [page, filteredDesigners, isLoadingMore, hasMore])

  useEffect(() => {
    if (inView && !isLoadingMore && hasMore) {
      loadMore()
    }
  }, [inView, loadMore, isLoadingMore, hasMore])

  useEffect(() => {
    if (filteredDesigners.length > 0 && displayedDesigners.length === 0) {
      loadMore()
    }
  }, [filteredDesigners, displayedDesigners.length, loadMore])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] pb-20">
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400 mb-4" />
          <p className="text-lg text-gray-600">Chargement des designers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8] pb-20">
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-4">
          <h1 className="text-3xl font-serif text-gray-900 mb-1">
            Designers ({displayedDesigners.length}/{filteredDesigners.length})
          </h1>
          <p className="text-sm text-gray-600 mb-4">Rechercher un designer...</p>

          <div className="space-y-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Toutes les périodes</option>
                <option value="mid-century">Mid-Century</option>
                <option value="art-deco">Art Déco</option>
                <option value="modernist">Modernist</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              >
                <option value="name-asc">Nom A → Z</option>
                <option value="name-desc">Nom Z → A</option>
                <option value="year-asc">Année (croissant)</option>
                <option value="year-desc">Année (décroissant)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {displayedDesigners.map((designer, index) => {
            const isAccessible = !user || userData?.role === "free" ? index < freeUserLimit : true
            const DesignerCard = isAccessible ? Link : "div"

            return (
              <DesignerCard
                key={index}
                {...(isAccessible ? { href: `/designers/${designer.slug}` } : {})}
                className="block"
              >
                <div
                  className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow ${
                    isAccessible ? "hover:shadow-lg" : "opacity-50 grayscale cursor-not-allowed"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex justify-center mb-3">
                      <div className="w-24 h-24 relative rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                        {designer.image ? (
                          <Image
                            src={designer.image || "/placeholder.svg"}
                            alt={designer.name}
                            fill
                            unoptimized
                            className="object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg"
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Users className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="font-serif text-base font-medium text-gray-900 mb-1 text-center leading-tight">
                      {designer.name}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2 text-center">{designer.count} luminaire(s)</p>

                    {designer.luminaires.length > 0 && (
                      <div className="aspect-square relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200 mb-3">
                        <Image
                          src={designer.luminaires[0].image || "/placeholder.svg"}
                          alt={designer.luminaires[0].name}
                          fill
                          unoptimized
                          className="object-contain p-2"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg"
                          }}
                        />
                      </div>
                    )}

                    {isAccessible ? (
                      <button className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-[#f2d895] hover:bg-gray-50 transition-colors">
                        Voir le designer →
                      </button>
                    ) : (
                      <div className="text-center text-xs text-gray-400">Premium requis</div>
                    )}
                  </div>
                </div>
              </DesignerCard>
            )
          })}
        </div>

        {hasMore && (
          <div ref={ref} className="text-center py-8">
            {isLoadingMore && (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-gray-600">Chargement...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around h-16">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 px-3 ${pathname === "/" ? "text-[#f2d895]" : "text-gray-600"}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link
            href="/designers"
            className={`flex flex-col items-center gap-1 px-3 ${pathname.startsWith("/designers") ? "text-[#f2d895]" : "text-gray-600"}`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs">Designers</span>
          </Link>
          <Link
            href="/luminaires"
            className={`flex flex-col items-center gap-1 px-3 ${pathname.startsWith("/luminaires") ? "text-[#f2d895]" : "text-gray-600"}`}
          >
            <Grid3x3 className="w-5 h-5" />
            <span className="text-xs">Collection</span>
          </Link>
          <Link
            href="/recherche"
            className={`flex flex-col items-center gap-1 px-3 ${pathname === "/recherche" ? "text-[#f2d895]" : "text-gray-600"}`}
          >
            <Mail className="w-5 h-5" />
            <span className="text-xs">Inquire</span>
          </Link>
          <Link
            href="/pricing"
            className={`flex flex-col items-center gap-1 px-3 ${pathname === "/pricing" ? "text-[#f2d895]" : "text-gray-600"}`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs">Account</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
