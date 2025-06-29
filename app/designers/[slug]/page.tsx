"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Palette, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { GalleryGrid } from "@/components/GalleryGrid"

interface Designer {
  nom: string
  count: number
  image?: string
}

interface Luminaire {
  _id: string
  "Nom luminaire": string
  "Nom du fichier": string
  "Artiste / Dates": string
  Spécialité?: string
  "Collaboration / Œuvre"?: string
  Année?: string
  Signé?: string
}

export default function DesignerPage() {
  const params = useParams()
  const designerName = decodeURIComponent(params.slug as string)

  const [designer, setDesigner] = useState<Designer | null>(null)
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)

  useEffect(() => {
    const fetchDesignerData = async () => {
      try {
        console.log("🔍 Chargement du designer:", designerName)

        // Charger les infos du designer
        const designerResponse = await fetch("/api/designers-data")
        const designerData = await designerResponse.json()

        if (designerData.success) {
          const foundDesigner = designerData.designers.find((d: Designer) => d.nom === designerName)
          if (foundDesigner) {
            setDesigner(foundDesigner)
            console.log("✅ Designer trouvé:", foundDesigner)
          }
        }

        // Charger les luminaires du designer
        const luminairesResponse = await fetch(`/api/designers/${encodeURIComponent(designerName)}`)
        const luminairesData = await luminairesResponse.json()

        if (luminairesData.success) {
          setLuminaires(luminairesData.luminaires)
          console.log(`✅ ${luminairesData.luminaires.length} luminaires trouvés`)
        }
      } catch (error) {
        console.error("❌ Erreur chargement designer:", error)
      } finally {
        setLoading(false)
      }
    }

    if (designerName) {
      fetchDesignerData()
    }
  }, [designerName])

  // Pagination
  const totalPages = Math.ceil(luminaires.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentLuminaires = luminaires.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du designer...</p>
        </div>
      </div>
    )
  }

  if (!designer) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Designer non trouvé</h1>
          <Link href="/designers">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux designers
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Navigation */}
      <Link href="/designers">
        <Button variant="outline" className="mb-6 bg-transparent">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux designers
        </Button>
      </Link>

      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="aspect-square relative mb-6 bg-gray-100 rounded-lg overflow-hidden">
                {designer.image ? (
                  <Image
                    src={designer.image || "/placeholder.svg"}
                    alt={designer.nom}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-gray-900">{designer.nom}</h1>
                <Badge variant="secondary" className="text-sm">
                  <Palette className="w-4 h-4 mr-1" />
                  {designer.count} luminaire{designer.count > 1 ? "s" : ""}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Luminaires de {designer.nom}</h2>
              <p className="text-gray-600">Découvrez les {luminaires.length} luminaires créés par ce designer.</p>
            </div>

            {/* Stats rapides */}
            {luminaires.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{luminaires.length}</div>
                    <div className="text-sm text-gray-600">Luminaires</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {new Set(luminaires.map((l) => l.Année).filter(Boolean)).size}
                    </div>
                    <div className="text-sm text-gray-600">Années</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {new Set(luminaires.map((l) => l.Spécialité).filter(Boolean)).size}
                    </div>
                    <div className="text-sm text-gray-600">Spécialités</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {luminaires.filter((l) => l.Signé === "Oui").length}
                    </div>
                    <div className="text-sm text-gray-600">Signés</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Luminaires Grid */}
      {luminaires.length > 0 ? (
        <div className="space-y-6">
          <GalleryGrid luminaires={currentLuminaires} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4">
              <Button
                variant="outline"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="flex items-center space-x-2 bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Précédent</span>
              </Button>

              <span className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages}
              </span>

              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-2 bg-transparent"
              >
                <span>Suivant</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun luminaire trouvé</h3>
          <p className="text-gray-600">Ce designer n'a pas encore de luminaires dans notre collection.</p>
        </div>
      )}
    </div>
  )
}
