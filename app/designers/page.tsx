"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SearchBar } from "@/components/SearchBar"
import { GalleryGrid } from "@/components/GalleryGrid"

// Fonction pour extraire le nom de l'artiste de la chaine de caractères
const getDesignerNameOnly = (str = ""): string => {
  if (!str) return ""
  return str.split("(")[0].trim()
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<any[]>([])
  const [designersData, setDesignersData] = useState<any[]>([])
  const [allLuminaires, setAllLuminaires] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        // Charger tous les luminaires
        const luminairesResponse = await fetch("/api/luminaires")
        const luminairesData = await luminairesResponse.json()

        if (luminairesData.success) {
          setAllLuminaires(luminairesData.luminaires)

          // Grouper les luminaires par designer
          const designerGroups = luminairesData.luminaires.reduce((acc: any, luminaire: any) => {
            const designerName = getDesignerNameOnly(luminaire.designer)
            if (!acc[designerName]) {
              acc[designerName] = {
                name: designerName,
                fullName: luminaire.designer,
                slug: designerName
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, ""),
                luminaires: [],
                count: 0,
                image: null,
              }
            }
            acc[designerName].luminaires.push(luminaire)
            acc[designerName].count++
            return acc
          }, {})

          // Charger les données des designers (images)
          try {
            const designersResponse = await fetch("/api/designers-data")
            const designersResult = await designersResponse.json()

            if (designersResult.success && designersResult.designers) {
              setDesignersData(designersResult.designers)

              // Associer les images aux designers
              Object.keys(designerGroups).forEach((designerName) => {
                const designerInfo = designersResult.designers.find(
                  (d: any) => d.Nom && getDesignerNameOnly(d.Nom).toLowerCase() === designerName.toLowerCase(),
                )

                if (designerInfo && designerInfo.imagedesigner) {
                  designerGroups[designerName].image = `/api/images/filename/${designerInfo.imagedesigner}`
                  designerGroups[designerName].imagedesigner = designerInfo.imagedesigner
                }
              })
            }
          } catch (error) {
            console.error("❌ Erreur chargement données designers:", error)
          }

          const designersArray = Object.values(designerGroups).sort((a: any, b: any) => a.name.localeCompare(b.name))
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

  const filteredDesigners = designers.filter((designer) =>
    designer.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (isLoading) {
    return <div className="text-center py-8">Chargement des designers...</div>
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-playfair text-dark mb-4">Designers</h1>
          <p className="text-gray-600 mb-6">Découvrez les créateurs de luminaires de notre collection</p>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Rechercher un designer..."
            className="max-w-md"
          />
        </div>

        <div className="space-y-12">
          {filteredDesigners.map((designer) => (
            <Card key={designer.slug} className="overflow-hidden">
              <CardContent className="p-8">
                {/* En-tête du designer */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
                  <div className="w-32 h-32 relative flex-shrink-0">
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full border-2 border-gray-200 overflow-hidden">
                      {designer.image ? (
                        <Image
                          src={designer.image || "/placeholder.svg"}
                          alt={designer.name}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            console.log("❌ Erreur chargement image designer:", designer.image)
                            e.currentTarget.style.display = "none"
                            const fallback = e.currentTarget.parentElement?.querySelector(".fallback-icon")
                            if (fallback) {
                              ;(fallback as HTMLElement).style.display = "block"
                            }
                          }}
                        />
                      ) : null}
                      <div className={`text-center fallback-icon ${designer.image ? "hidden" : ""}`}>
                        <div className="text-4xl text-gray-400 mb-1">👤</div>
                        <span className="text-xs text-gray-500">Image</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-3xl font-playfair text-dark mb-2">{designer.name}</h2>
                    <p className="text-lg text-gray-600 mb-4">
                      {designer.count} luminaire{designer.count > 1 ? "s" : ""} dans la collection
                    </p>
                    <Link href={`/designers/${designer.slug}`}>
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                        Voir la collection complète
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Luminaires du designer */}
                <div>
                  <h3 className="text-xl font-medium text-dark mb-4">Luminaires réalisés</h3>
                  <GalleryGrid
                    items={designer.luminaires.slice(0, 6).map((lum: any) => ({
                      ...lum,
                      id: lum._id,
                      image: lum["Nom du fichier"] ? `/api/images/filename/${lum["Nom du fichier"]}` : null,
                      filename: lum["Nom du fichier"] || lum.filename || "",
                      artist: getDesignerNameOnly(lum.designer),
                      year: lum.annee,
                      name: lum.nom,
                    }))}
                    viewMode="grid"
                    onItemUpdate={() => {}}
                    showPagination={false}
                  />
                  {designer.count > 6 && (
                    <div className="text-center mt-4">
                      <Link href={`/designers/${designer.slug}`}>
                        <Button variant="outline">Voir les {designer.count - 6} autres luminaires</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDesigners.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun designer trouvé pour "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  )
}
