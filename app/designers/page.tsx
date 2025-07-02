"use client"

import { useState, useEffect, useCallback } from "react"
import { useInView } from "react-intersection-observer"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

export default function DesignersPage() {
  const [designers, setDesigners] = useState([])
  const [displayedDesigners, setDisplayedDesigners] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const { userData } = useAuth()

  const ITEMS_PER_PAGE = 50

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  })

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        // Charger tous les luminaires pour extraire TOUS les designers
        const luminairesResponse = await fetch("/api/luminaires?limit=10000")
        const luminairesData = await luminairesResponse.json()

        if (luminairesData.success) {
          console.log(`👨‍🎨 Extraction des designers depuis ${luminairesData.luminaires.length} luminaires`)

          // Grouper les luminaires par designer (Artiste / Dates)
          const designerGroups = luminairesData.luminaires.reduce((acc: any, luminaire: any) => {
            const designerName = luminaire["Artiste / Dates"] || luminaire.designer || "Designer inconnu"

            if (!acc[designerName]) {
              acc[designerName] = {
                name: designerName,
                count: 0,
                luminaires: [],
                image: "",
                slug: encodeURIComponent(designerName),
              }
            }

            acc[designerName].count++
            acc[designerName].luminaires.push({
              ...luminaire,
              image: luminaire["Nom du fichier"]
                ? `/api/images/filename/${luminaire["Nom du fichier"]}`
                : "/placeholder.svg",
              name: luminaire["Nom luminaire"] || luminaire.nom || "Sans nom",
            })

            return acc
          }, {})

          console.log(`👨‍🎨 ${Object.keys(designerGroups).length} designers uniques trouvés`)

          // Charger les images des designers depuis l'API designers-data
          try {
            const designersResponse = await fetch("/api/designers-data")
            const designersResult = await designersResponse.json()

            if (designersResult.success && designersResult.designers) {
              console.log(`🖼️ ${designersResult.designers.length} images de designers disponibles`)

              // Associer les images aux designers
              Object.keys(designerGroups).forEach((designerName) => {
                const designerInfo = designersResult.designers.find(
                  (d: any) => d.Nom && d.Nom.toLowerCase().trim() === designerName.toLowerCase().trim(),
                )

                if (designerInfo && designerInfo.imagedesigner) {
                  designerGroups[designerName].image = `/api/images/filename/${designerInfo.imagedesigner}`
                  console.log(`🖼️ Image trouvée pour ${designerName}: ${designerInfo.imagedesigner}`)
                }
              })
            }
          } catch (error) {
            console.error("❌ Erreur chargement données designers:", error)
          }

          const designersArray = Object.values(designerGroups).sort((a: any, b: any) => a.name.localeCompare(b.name))

          console.log(`✅ ${designersArray.length} designers finaux`)

          // Pour les utilisateurs "free", limiter à 10% des designers
          if (userData?.role === "free") {
            const limitedDesigners = designersArray.slice(0, Math.max(Math.floor(designersArray.length * 0.1), 5))
            setDesigners(limitedDesigners)
          } else {
            setDesigners(designersArray)
          }
        }
      } catch (error) {
        console.error("❌ Erreur chargement données:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userData])

  // Charger plus d'éléments
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    setTimeout(() => {
      const startIndex = page * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const newItems = designers.slice(startIndex, endIndex)

      if (page === 0) {
        setDisplayedDesigners(newItems)
      } else {
        setDisplayedDesigners((prev) => [...prev, ...newItems])
      }

      setPage((prev) => prev + 1)
      setHasMore(endIndex < designers.length)
      setIsLoadingMore(false)
    }, 300)
  }, [page, designers, isLoadingMore, hasMore])

  // Charger plus quand on arrive en bas
  useEffect(() => {
    if (inView && !isLoadingMore && hasMore) {
      loadMore()
    }
  }, [inView, loadMore, isLoadingMore, hasMore])

  // Charger la première page
  useEffect(() => {
    if (designers.length > 0 && displayedDesigners.length === 0) {
      loadMore()
    }
  }, [designers, displayedDesigners.length, loadMore])

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
        <h1 className="text-4xl font-serif text-gray-900 mb-8">Designers ({designers.length})</h1>

        {/* Message pour les utilisateurs "free" */}
        {userData?.role === "free" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="flex items-center font-serif">
              <span className="mr-2">ℹ️</span>
              <span>
                Vous utilisez un compte gratuit. Seuls 10% des designers sont affichés.
                <Link href="#" className="ml-1 underline font-medium">
                  Passez à Premium
                </Link>{" "}
                pour voir tous les designers.
              </span>
            </p>
          </div>
        )}

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
              {displayedDesigners.map((designer, index) => (
                <Link key={index} href={`/designers/${designer.slug}`}>
                  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
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

                      <span
                        className="font-medium font-serif hover:opacity-80 transition-opacity"
                        style={{ color: "#d4a574" }}
                      >
                        Voir le designer →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
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
