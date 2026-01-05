"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SearchBar } from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, Users } from "lucide-react"
import { MobileFooter } from "@/components/MobileFooter"

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
  const { user, userData } = useAuth()
  const pathname = usePathname()
  const [filterMode, setFilterMode] = useState<"period" | "az">("period")
  const [periodFilter, setPeriodFilter] = useState("")
  const yearFilter = ["modern", "contemporary", "art-deco"] // Declare yearFilter variable

  const ITEMS_PER_PAGE = 50

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  })

  // Calculer la limite pour les comptes gratuits
  const freeUserLimit =
    !user || userData?.role === "free" ? Math.ceil(filteredDesigners.length * 0.1) : filteredDesigners.length

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        // Charger tous les luminaires pour extraire TOUS les designers
        const luminairesResponse = await fetch("/api/luminaires?limit=10000")
        const luminairesData = await luminairesResponse.json()

        if (luminairesData.success) {
          console.log(`👨‍🎨 Extraction des designers depuis ${luminairesData.luminaires.length} luminaires`)

          // Grouper les luminaires par designer et récupérer l'image du designer
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
              console.log(`🖼️ Image designer trouvée pour ${designerName}: ${luminaire.designerImageFilename}`)
            }

            // Construction de l'URL de l'image du luminaire
            let luminaireImageUrl = "/placeholder.svg"
            if (luminaire.imageId) {
              luminaireImageUrl = `/api/images/${luminaire.imageId}`
              console.log(`🖼️ Image luminaire via imageId pour ${designerName}: ${luminaire.imageId}`)
            } else if (luminaire.filename) {
              luminaireImageUrl = `/api/images/filename/${luminaire.filename}`
              console.log(`🖼️ Image luminaire via filename pour ${designerName}: ${luminaire.filename}`)
            } else if (luminaire["Nom du fichier"]) {
              luminaireImageUrl = `/api/images/filename/${luminaire["Nom du fichier"]}`
              console.log(`🖼️ Image luminaire via Nom du fichier pour ${designerName}: ${luminaire["Nom du fichier"]}`)
            }

            acc[designerName].luminaires.push({
              ...luminaire,
              image: luminaireImageUrl,
              name: luminaire["Nom luminaire"] || luminaire.nom || "Sans nom",
            })

            // Extraire les années du champ "Artiste / Dates"
            const artistDates = luminaire["Artiste / Dates"] || luminaire.designer || ""
            const yearMatches = artistDates.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g)
            if (yearMatches) {
              acc[designerName].years = [
                ...new Set([...acc[designerName].years, ...yearMatches.map((y) => Number.parseInt(y))]),
              ]
            }

            return acc
          }, {})

          console.log(`👨‍🎨 ${Object.keys(designerGroups).length} designers uniques trouvés`)

          // Essayer aussi l'ancienne méthode en fallback
          try {
            const designersResponse = await fetch("/api/designers-data")
            const designersResult = await designersResponse.json()

            if (designersResult.success && designersResult.designers) {
              console.log(`🖼️ ${designersResult.designers.length} images de designers disponibles (fallback)`)

              // Associer les images aux designers qui n'en ont pas encore
              Object.keys(designerGroups).forEach((designerName) => {
                if (!designerGroups[designerName].image) {
                  const designerInfo = designersResult.designers.find(
                    (d: any) => d.Nom && d.Nom.toLowerCase().trim() === designerName.toLowerCase().trim(),
                  )

                  if (designerInfo && designerInfo.imagedesigner) {
                    designerGroups[designerName].image = `/api/images/filename/${designerInfo.imagedesigner}`
                    console.log(`🖼️ Image fallback trouvée pour ${designerName}: ${designerInfo.imagedesigner}`)
                  }
                }
              })
            }
          } catch (error) {
            console.error("❌ Erreur chargement données designers fallback:", error)
          }

          const designersArray = Object.values(designerGroups).sort((a: any, b: any) => a.name.localeCompare(b.name))

          console.log(`✅ ${designersArray.length} designers finaux`)

          // Stocker TOUS les designers
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

  // Filtrer et trier
  useEffect(() => {
    let filtered = [...allDesigners]

    if (searchTerm) {
      filtered = filtered.filter((designer) => designer.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (periodFilter) {
      filtered = filtered.filter((designer) => designer.years.some((year) => yearFilter.includes(year)))
    }

    // Supprimer les doublons
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

  // Charger plus d'éléments - maintenant charge TOUS les designers
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

  // Charger plus quand on arrive en bas
  useEffect(() => {
    if (inView && !isLoadingMore && hasMore) {
      loadMore()
    }
  }, [inView, loadMore, isLoadingMore, hasMore])

  // Charger la première page
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
      <div className="bg-transparent border-b border-gray-200">
        <div className="px-4 py-4">
          <h2 className="text-2xl font-serif text-gray-900 mb-4">
            Designers{" "}
            <span className="text-gray-500">
              ({displayedDesigners.length}/{filteredDesigners.length})
            </span>
          </h2>

          {/* Premium message for non-premium users */}
          {!user || (userData?.role !== "premium" && userData?.role !== "admin") ? (
            <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Accès limité - Vous voyez 10% des designers</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    Passez à Premium pour voir tous les designers sans restriction !
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

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search bar */}
            <div className="md:flex-1 md:max-w-md">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Rechercher un designer..."
                className="bg-transparent border border-gray-300"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Toutes les périodes</option>
                <option value="modern">Moderne</option>
                <option value="contemporary">Contemporain</option>
                <option value="art-deco">Art Déco</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              >
                <option value="name-asc">Nom A → Z</option>
                <option value="name-desc">Nom Z → A</option>
                <option value="year-asc">Année croissante</option>
                <option value="year-desc">Année décroissante</option>
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
                  className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow flex flex-col h-full ${
                    isAccessible ? "hover:shadow-lg" : "opacity-50 grayscale cursor-not-allowed"
                  }`}
                >
                  <div className="p-3 flex flex-col flex-1">
                    <div className="flex gap-2 mb-3">
                      {/* Large portrait */}
                      <div className="w-1/2 aspect-square relative flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
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

                      {/* 4 miniatures en grille 2x2 */}
                      <div className="w-1/2 grid grid-cols-2 gap-1.5">
                        {designer.luminaires.slice(0, 4).map((luminaire: any, idx: number) => (
                          <div key={idx} className="aspect-square relative bg-gray-100 rounded-md overflow-hidden">
                            <Image
                              src={luminaire.image || "/placeholder.svg"}
                              alt={luminaire.name}
                              fill
                              unoptimized
                              className="object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg"
                              }}
                            />
                          </div>
                        ))}
                        {/* Compléter la grille 2x2 si moins de 4 items */}
                        {Array.from({ length: Math.max(0, 4 - designer.luminaires.length) }).map((_, idx) => (
                          <div key={`empty-${idx}`} className="aspect-square bg-gray-50 rounded-md" />
                        ))}
                      </div>
                    </div>

                    {/* Designer info */}
                    <h3 className="font-serif text-base font-medium text-gray-900 mb-1 leading-tight flex-1">
                      {designer.name}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2">
                      {designer.years.length > 0
                        ? `${Math.min(...designer.years)}-${Math.max(...designer.years)}`
                        : "Période inconnue"}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">{designer.count} luminaires</p>

                    {isAccessible ? (
                      <button
                        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                        style={{ backgroundColor: "#f5f1e8" }}
                      >
                        <span>Voir le profil</span>
                        <span>→</span>
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

        {/* Loading indicator */}
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

      <MobileFooter />
    </div>
  )
}
