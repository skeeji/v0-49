"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Palette, Star } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Designer {
  name: string
  image?: string
  luminaires: any[]
  totalCount: number
  periods: string[]
  yearRange: {
    min: number
    max: number
  }
}

export default function DesignerPage() {
  const params = useParams()
  const slug = params.slug as string
  const [designer, setDesigner] = useState<Designer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDesigner = async () => {
      try {
        setLoading(true)
        setError(null)

        // Décoder le slug pour gérer les caractères spéciaux
        const decodedSlug = decodeURIComponent(slug)
        console.log(`🔍 Recherche du designer: "${decodedSlug}"`)

        const response = await fetch(`/api/designers/${encodeURIComponent(decodedSlug)}`)
        const data = await response.json()

        if (data.success && data.designer) {
          console.log(`✅ Designer trouvé:`, data.designer)

          // CORRECTION 2: Rechercher l'image du designer dans les luminaires
          if (!data.designer.image && data.designer.luminaires && data.designer.luminaires.length > 0) {
            console.log(`🔍 Recherche de l'image designer dans les luminaires...`)

            // Chercher dans tous les luminaires de ce designer
            for (const luminaire of data.designer.luminaires) {
              const designerImageFields = [
                luminaire.designerImageFilename,
                luminaire.designerImage,
                luminaire["designer.jpg"],
                luminaire.designer_image,
                luminaire.imageDesigner,
              ]

              for (const imageField of designerImageFields) {
                if (imageField && typeof imageField === "string") {
                  console.log(`📸 Image designer trouvée: ${imageField}`)
                  data.designer.image = `/api/images/filename/${encodeURIComponent(imageField)}`
                  break
                }
              }

              if (data.designer.image) break
            }

            if (data.designer.image) {
              console.log(`✅ Image designer assignée: ${data.designer.image}`)
            } else {
              console.log(`⚠️ Aucune image designer trouvée pour ${data.designer.name}`)
            }
          }

          setDesigner(data.designer)
        } else {
          throw new Error(data.error || "Designer non trouvé")
        }
      } catch (err: any) {
        console.error("❌ Erreur chargement designer:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchDesigner()
    }
  }, [slug])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement du designer...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !designer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur: {error || "Designer non trouvé"}</p>
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
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <div className="mb-6">
        <Link href="/designers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux designers
          </Button>
        </Link>
      </div>

      {/* En-tête du designer */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Image du designer */}
          <div className="flex-shrink-0">
            {designer.image ? (
              <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={designer.image || "/placeholder.svg"}
                  alt={designer.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    console.error(`❌ Erreur chargement image designer: ${designer.image}`)
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>
            ) : (
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg bg-gray-200 flex items-center justify-center">
                <Palette className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Informations du designer */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">{designer.name}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-500" />
                <span className="text-gray-600">
                  <strong>{designer.totalCount}</strong> luminaire{designer.totalCount > 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                <span className="text-gray-600">
                  {designer.yearRange.min} - {designer.yearRange.max}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-orange-500" />
                <span className="text-gray-600">
                  {designer.periods.length} période{designer.periods.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Périodes */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Périodes</h3>
              <div className="flex flex-wrap gap-2">
                {designer.periods.map((period, index) => (
                  <Badge key={index} variant="secondary">
                    {period}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Luminaires du designer */}
      <div>
        <h2 className="text-2xl font-serif text-gray-900 mb-6">Luminaires ({designer.totalCount})</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {designer.luminaires.map((luminaire) => (
            <Card key={luminaire._id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                {/* Image du luminaire */}
                <div className="relative aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden">
                  {luminaire.filename ? (
                    <Image
                      src={`/api/images/filename/${encodeURIComponent(luminaire.filename)}`}
                      alt={luminaire.nom || "Luminaire"}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Informations du luminaire */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{luminaire.nom || "Sans nom"}</h3>

                  <div className="space-y-1 text-sm text-gray-600">
                    {luminaire.annee && (
                      <p>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {luminaire.annee}
                      </p>
                    )}

                    {luminaire.periode && (
                      <p>
                        <Badge variant="outline" className="text-xs">
                          {luminaire.periode}
                        </Badge>
                      </p>
                    )}
                  </div>

                  {/* Lien vers le détail */}
                  <div className="mt-4">
                    <Link href={`/luminaires/${luminaire._id}`}>
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        Voir le détail
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
