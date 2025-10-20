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

            const imageFilename = luminaire.filename || luminaire["Nom du fichier"]

            acc[designerName].luminaires.push({
              ...luminaire,
              image: imageFilename ? `/api/images/filename/${imageFilename}` : "/placeholder.svg",
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
  }, [allDesigners, searchTerm, sortBy])

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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400 mb-4" />
          <p className="text-lg text-gray-600 font-serif">Chargement des designers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-serif text-gray-900 mb-8">
          Designers ({displayedDesigners.length}/{filteredDesigners.length})
        </h1>

        {/* Message pour les utilisateurs non connectés ou "free" */}
        {(!user || userData?.role === "free") && (
          <div
            className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-sm"
            style={{ color: "#d4a574" }}
          >
            <p className="flex items-center font-serif">
              <span className="mr-2"></span>
              <span>
                {!user ? "Connectez-vous" : "Vous utilisez un compte gratuit"}. Seuls 10% des designers sont accessibles
                ({freeUserLimit} designers).
                <Link href="/pricing" className="ml-1 underline font-medium">
                  Passez à Premium
                </Link>{" "}
                pour accéder à tous les designers.
              </span>
            </p>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un designer..." />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="name-asc">Nom A → Z</option>
              <option value="name-desc">Nom Z → A</option>
              <option value="year-asc">Année croissante</option>
              <option value="year-desc">Année décroissante</option>
            </select>
          </div>
        </div>

        {/* Grille des designers */}
        {displayedDesigners.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg font-serif">Aucun designer trouvé</p>
            <p className="text-gray-400 text-sm mt-2 font-serif">
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
                      className={`bg-white rounded-xl p-6 shadow-lg transition-shadow cursor-pointer h-full ${
                        isAccessible ? "hover:shadow-xl" : "opacity-50 grayscale cursor-not-allowed"
                      }`}
                    >
                      <div className="text-center">
                        {/* Portrait circulaire */}
                        <div className="w-24 h-24 mx-auto mb-4 relative">
                          {designer.image ? (
                            <Image
                              src={designer.image || "/placeholder.svg"}
                              alt={designer.name}
                              fill
                              className="object-cover rounded-full"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg"
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full border-2 border-gray-200">
                              <div className="text-center">
                                <div className="text-2xl text-gray-400 mb-1">👤</div>
                                <span className="text-xs text-gray-500 font-serif">Image manquante</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <h3 className="text-xl font-serif text-gray-900 mb-2">{designer.name}</h3>

                        <p className="text-gray-600 mb-4 font-serif">
                          {designer.count} luminaire{designer.count > 1 ? "s" : ""}
                        </p>

                        {/* Aperçu des luminaires */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {designer.luminaires.slice(0, 3).map((luminaire: any, idx: number) => (
                            <div key={idx} className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                              <Image
                                src={luminaire.image || "/placeholder.svg"}
                                alt={luminaire.name}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg?height=80&width=80"
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        {isAccessible ? (
                          <span
                            className="font-medium font-serif hover:opacity-80 transition-opacity"
                            style={{ color: "#d4a574" }}
                          >
                            Voir le designer →
                          </span>
                        ) : (
                          <div className="text-center">
                            <span className="text-gray-400 font-serif text-sm">🔒 Premium requis</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </DesignerCard>
                )
              })}
            </div>

            {/* Indicateur de chargement */}
            {hasMore && (
              <div ref={ref} className="text-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-gray-600 font-serif">Chargement...</span>
                  </div>
                )}
              </div>
            )}

            {!hasMore && displayedDesigners.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="font-serif">Tous les designers ont été chargés</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
