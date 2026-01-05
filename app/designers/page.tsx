"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SearchBar } from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, Users } from "lucide-react"
import { MobileFooter } from "@/components/MobileFooter"

export default function DesignersPage() {
  const [allDesigners, setAllDesigners] = useState<any[]>([])
  const [designers, setDesigners] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState("name-asc")
  const [isLoading, setIsLoading] = useState(true)
  const { user, userData } = useAuth()
  const pathname = usePathname()

  const isPremium = userData?.role === "premium" || userData?.role === "admin"
  const totalDesigners = allDesigners.length
  const freeUserLimit = Math.ceil(totalDesigners * 0.1)

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
          setDesigners(designersArray)
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

    if (searchQuery) {
      filtered = filtered.filter((designer) => designer.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    filtered.sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "count-desc":
          return b.count - a.count
        case "count-asc":
          return a.count - b.count
        default:
          return 0
      }
    })

    setDesigners(filtered)
  }, [searchQuery, sortOption, allDesigners])

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
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-serif text-gray-900 mb-6 text-center md:text-left">
          Designers <span className="text-gray-500">({totalDesigners})</span>
        </h1>

        {!isPremium && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-serif text-base font-medium text-gray-900 mb-1">
                  Accès limité - Collection découverte
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Vous voyez <span className="font-semibold">{freeUserLimit} designers</span> sur{" "}
                  <span className="font-semibold">{totalDesigners}</span> disponibles. Passez à Premium pour explorer
                  tous les designers sans restriction !
                </p>
                <Link href="/pricing">
                  <button className="px-4 py-2 bg-[#8b7355] text-white text-sm font-medium rounded-lg hover:bg-[#75614a] transition-colors">
                    Découvrir Premium →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="hidden md:flex items-center gap-4 mb-6">
          <div className="flex-1 max-w-xl">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Rechercher un designer..." />
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="name-asc">Nom A-Z</option>
            <option value="name-desc">Nom Z-A</option>
            <option value="count-desc">Plus de luminaires</option>
            <option value="count-asc">Moins de luminaires</option>
          </select>
        </div>

        <div className="md:hidden mb-6 space-y-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Rechercher un designer..." />

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="name-asc">Nom A-Z</option>
            <option value="name-desc">Nom Z-A</option>
            <option value="count-desc">Plus de luminaires</option>
            <option value="count-asc">Moins de luminaires</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {designers.map((designer, index) => {
            const isAccessible = index < freeUserLimit || isPremium
            const DesignerCard = isAccessible ? Link : "div"

            return (
              <DesignerCard
                key={designer.name}
                href={isAccessible ? `/designers/${encodeURIComponent(designer.name)}` : undefined}
                className={`block ${isAccessible ? "" : "opacity-40 cursor-not-allowed"}`}
              >
                <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 flex flex-col h-full">
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex gap-2 mb-3">
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
                        {Array.from({ length: Math.max(0, 4 - designer.luminaires.length) }).map((_, idx) => (
                          <div key={`empty-${idx}`} className="aspect-square bg-gray-50 rounded-md" />
                        ))}
                      </div>
                    </div>

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
      </div>

      <MobileFooter />
    </div>
  )
}
