"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

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
            console.error("Erreur chargement donnees designers fallback:", error)
          }

          const designersArray = Object.values(designerGroups).sort((a: any, b: any) => a.name.localeCompare(b.name))

          setAllDesigners(designersArray)
          setFilteredDesigners(designersArray)
        }
      } catch (error) {
        console.error("Erreur chargement donnees:", error)
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
  }, [allDesigners, searchTerm, sortBy])

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
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50">
        <div className="container-responsive py-16">
          <div className="text-center py-24 animate-fade-in">
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-accent mb-6" />
            <p className="text-xl text-muted-foreground font-light">Chargement des designers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50">
      <div className="container-responsive py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 animate-slide-up">
            <h1 className="text-foreground mb-4">Designers</h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {displayedDesigners.length}/{filteredDesigners.length} designer{filteredDesigners.length > 1 ? "s" : ""}{" "}
              dans notre collection
            </p>
          </div>

          {(!user || userData?.role === "free") && (
            <div className="glass-morphism rounded-2xl p-6 mb-8 animate-fade-in">
              <p className="flex items-start gap-3 leading-relaxed text-foreground/80">
                <span className="text-xl">ℹ️</span>
                <span>
                  {!user ? "Connectez-vous" : "Vous utilisez un compte gratuit"}. Seuls 10% des designers sont
                  accessibles ({freeUserLimit} designers).
                  <Link href="/pricing" className="ml-2 underline font-medium text-accent hover:text-accent/80">
                    Passez à Premium
                  </Link>{" "}
                  pour accéder à tous les designers.
                </span>
              </p>
            </div>
          )}

          <div className="glass-morphism rounded-2xl p-6 mb-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Rechercher un designer..."
                className="rounded-full"
              />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border-2 border-border bg-background rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="name-asc">Nom A - Z</option>
                <option value="name-desc">Nom Z - A</option>
                <option value="year-asc">Annee croissante</option>
                <option value="year-desc">Annee decroissante</option>
              </select>
            </div>
          </div>

          {displayedDesigners.length === 0 && !isLoading ? (
            <div className="text-center py-24 animate-fade-in">
              <div className="max-w-md mx-auto">
                <p className="text-2xl text-foreground font-light mb-3">Aucun designer trouve</p>
                <p className="text-muted-foreground">
                  Importez des luminaires et des designers pour voir cette section
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
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
                        className={`glass-morphism rounded-2xl p-6 transition-all duration-300 h-full ${
                          isAccessible
                            ? "hover:shadow-2xl hover:scale-105 cursor-pointer"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="text-center">
                          <div className="w-28 h-28 mx-auto mb-5 relative">
                            {designer.image ? (
                              <Image
                                src={designer.image || "/placeholder.svg"}
                                alt={designer.name}
                                fill
                                unoptimized
                                className="object-cover rounded-full shadow-lg border-2 border-accent/20"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg"
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted rounded-full border-2 border-border">
                                <div className="text-center">
                                  <div className="text-3xl text-muted-foreground mb-1">👤</div>
                                  <span className="text-xs text-muted-foreground">Image manquante</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <h3 className="text-xl font-medium text-foreground mb-3 leading-tight">{designer.name}</h3>

                          <p className="text-muted-foreground mb-5">
                            {designer.count} luminaire{designer.count > 1 ? "s" : ""}
                          </p>

                          <div className="grid grid-cols-3 gap-2 mb-5">
                            {designer.luminaires.slice(0, 3).map((luminaire: any, idx: number) => (
                              <div
                                key={idx}
                                className="aspect-square relative bg-muted/30 rounded-lg overflow-hidden border border-border/50"
                              >
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
                          </div>

                          {isAccessible ? (
                            <span className="text-accent font-medium hover:text-accent/80 transition-colors">
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
                <div ref={ref} className="text-center py-12">
                  {isLoadingMore && (
                    <div className="flex items-center justify-center gap-3 animate-fade-in">
                      <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      <span className="text-muted-foreground font-medium">Chargement...</span>
                    </div>
                  )}
                </div>
              )}

              {!hasMore && displayedDesigners.length > 0 && (
                <div className="text-center py-12 animate-fade-in">
                  <p className="text-muted-foreground">Tous les designers ont ete charges</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
