"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"

const PERIODS = [
  { id: "1960s", label: "1960s - 1990s", start: 1960, end: 1990 },
  { id: "1990s", label: "1990s - 1960s", start: 1990, end: 1960 },
  { id: "1920s", label: "1920s - 1930s", start: 1920, end: 1930 },
  { id: "contemporary", label: "Contemporary", start: 1961, end: 2024 },
  { id: "modernism", label: "Modernism", start: 1900, end: 1960 },
  { id: "art-deco", label: "Art Deco", start: 1920, end: 1939 },
]

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
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const { user, userData } = useAuth()

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
          console.log(`👨‍🎨 Extraction des designers depuis ${luminairesData.luminaires.length} luminaires`)

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

          try {
            const designersResponse = await fetch("/api/designers-data")
            const designersResult = await designersResponse.json()

            if (designersResult.success && designersResult.designers) {
              console.log(`🖼️ ${designersResult.designers.length} images de designers disponibles (fallback)`)

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

    if (selectedPeriod !== "all") {
      const period = PERIODS.find((p) => p.id === selectedPeriod)
      if (period) {
        filtered = filtered.filter((designer) => {
          if (designer.years && designer.years.length > 0) {
            const minYear = Math.min(...designer.years)
            const maxYear = Math.max(...designer.years)
            return (
              (minYear >= period.start && minYear <= period.end) || (maxYear >= period.start && maxYear <= period.end)
            )
          }
          return false
        })
      }
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
  }, [allDesigners, searchTerm, sortBy, selectedPeriod])

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
      <div className="container-responsive py-12">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-beige-dark border-t-gold mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground font-serif">Chargement des designers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-2">
            Designers ({displayedDesigners.length}/{filteredDesigners.length})
          </h1>
          <p className="text-muted-foreground">Rechercher un designer...</p>
        </div>

        {(!user || userData?.role === "free") && (
          <div className="bg-gradient-to-r from-gold/10 to-beige border-2 border-gold rounded-xl p-4 mb-6 shadow-sm">
            <p className="text-sm text-foreground flex items-start gap-2">
              <span>
                <span className="font-semibold text-gold">
                  {!user ? "Connectez-vous" : "Vous utilisez un compte gratuit"}.
                </span>{" "}
                Seuls 10% des designers sont accessibles ({freeUserLimit} designers).
                <Link href="/pricing" className="ml-1 text-gold font-bold hover:underline">
                  Passez à Premium →
                </Link>
              </span>
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 border border-border shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />

            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border-2 border-border rounded-lg text-sm bg-white hover:border-gold transition-colors"
            >
              <option value="all">Toutes les périodes</option>
              {PERIODS.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border-2 border-border rounded-lg text-sm bg-white hover:border-gold transition-colors"
            >
              <option value="name-asc">Nom A → Z</option>
              <option value="name-desc">Nom Z → A</option>
              <option value="year-asc">Année croissante</option>
              <option value="year-desc">Année décroissante</option>
            </select>
          </div>
        </div>

        {displayedDesigners.length === 0 && !isLoading ? (
          <div className="text-center py-16 bg-beige rounded-xl">
            <p className="text-foreground text-lg font-medium mb-2">Aucun designer trouvé</p>
            <p className="text-muted-foreground text-sm">
              Importez des luminaires et des designers pour voir cette section
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayedDesigners.map((designer, index) => {
                const isAccessible = !user || userData?.role === "free" ? index < freeUserLimit : true
                const DesignerCard = isAccessible ? Link : "div"

                return (
                  <DesignerCard key={index} {...(isAccessible ? { href: `/designers/${designer.slug}` } : {})}>
                    <div
                      className={`bg-white rounded-xl p-6 border border-border transition-all h-full ${
                        isAccessible
                          ? "hover:shadow-lg hover:border-gold cursor-pointer"
                          : "opacity-50 grayscale cursor-not-allowed"
                      }`}
                    >
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-4 relative">
                          {designer.image ? (
                            <Image
                              src={designer.image || "/placeholder.svg"}
                              alt={designer.name}
                              fill
                              unoptimized
                              className="object-cover rounded-full border-2 border-gold/20"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg"
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-beige rounded-full border-2 border-gold/20">
                              <div className="text-center">
                                <div className="text-2xl text-gold mb-1">👤</div>
                                <span className="text-xs text-muted-foreground font-serif">Image manquante</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <h3 className="text-lg font-serif text-foreground mb-2 line-clamp-2">{designer.name}</h3>

                        <p className="text-sm text-muted-foreground mb-4">
                          {designer.count} luminaire{designer.count > 1 ? "s" : ""}
                        </p>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {designer.luminaires.slice(0, 3).map((luminaire: any, idx: number) => (
                            <div key={idx} className="aspect-square relative bg-cream rounded-lg overflow-hidden">
                              <Image
                                src={luminaire.image || "/placeholder.svg"}
                                alt={luminaire.name}
                                fill
                                unoptimized
                                className="object-cover"
                                onError={(e) => {
                                  console.error(`❌ Erreur chargement image luminaire: ${luminaire.image}`)
                                  e.currentTarget.src = "/placeholder.svg"
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        {isAccessible ? (
                          <span className="text-sm font-medium text-gold hover:underline transition-all">
                            Voir le designer →
                          </span>
                        ) : (
                          <div className="text-center">
                            <span className="text-muted-foreground text-sm">Premium requis</span>
                          </div>
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
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gold border-t-transparent"></div>
                    <span className="text-muted-foreground">Chargement...</span>
                  </div>
                )}
              </div>
            )}

            {!hasMore && displayedDesigners.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Tous les designers ont été chargés</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
