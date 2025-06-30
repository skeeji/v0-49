"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Palette, Calendar, Lightbulb } from "lucide-react"

interface Designer {
  _id: string
  nom: string
  imagedesigner?: string
  slug: string
  luminairesCount: number
}

interface Luminaire {
  _id: string
  "Nom luminaire": string
  "Nom du fichier": string
  "Artiste / Dates": string
  Année: string
  Spécialité: string
}

export default function DesignerDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const [designer, setDesigner] = useState<Designer | null>(null)
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDesigner = async () => {
      if (!slug) return

      try {
        setLoading(true)
        setError(null)

        console.log(`🔍 Chargement designer: ${slug}`)

        const response = await fetch(`/api/designers/${encodeURIComponent(slug)}`)
        const data = await response.json()

        console.log("📊 Réponse API designer:", data)

        if (data.success) {
          setDesigner(data.designer)
          setLuminaires(data.luminaires || [])
        } else {
          setError(data.error || "Designer non trouvé")
        }
      } catch (error: any) {
        console.error("❌ Erreur API:", error)
        setError("Erreur serveur")
      } finally {
        setLoading(false)
      }
    }

    fetchDesigner()
  }, [slug])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="w-full h-64 mb-4" />
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="w-full h-48" />
                    <div className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !designer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/designers">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux designers
          </Button>
        </Link>

        <div className="text-center py-12">
          <Palette className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-600 mb-2">Designer non trouvé</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/designers">
            <Button>Voir tous les designers</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Bouton retour */}
      <Link href="/designers">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux designers
        </Button>
      </Link>

      {/* Informations du designer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              {/* Image du designer */}
              <div className="relative w-full h-64 mb-6 bg-gray-100 rounded-lg overflow-hidden">
                {designer.imagedesigner ? (
                  <Image
                    src={`/api/images/filename/${encodeURIComponent(designer.imagedesigner)}`}
                    alt={designer.nom}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?height=300&width=300&text=Designer"
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                    <Palette className="w-20 h-20 text-blue-400" />
                  </div>
                )}
              </div>

              {/* Nom et informations */}
              <h1 className="text-2xl font-bold mb-4">{designer.nom}</h1>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    {luminaires.length} luminaire{luminaires.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-blue-600" />
            Luminaires ({luminaires.length})
          </h2>

          {luminaires.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {luminaires.map((luminaire) => (
                <Link key={luminaire._id} href={`/luminaires/${luminaire._id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                    <CardContent className="p-0">
                      {/* Image du luminaire */}
                      <div className="relative w-full h-48 bg-gray-100">
                        {luminaire["Nom du fichier"] ? (
                          <Image
                            src={`/api/images/filename/${encodeURIComponent(luminaire["Nom du fichier"])}`}
                            alt={luminaire["Nom luminaire"]}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=200&width=200&text=Luminaire"
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
                            <Lightbulb className="w-16 h-16 text-amber-400" />
                          </div>
                        )}
                      </div>

                      {/* Informations du luminaire */}
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {luminaire["Nom luminaire"]}
                        </h3>

                        <div className="flex items-center justify-between">
                          {luminaire["Année"] && (
                            <Badge variant="secondary" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {luminaire["Année"]}
                            </Badge>
                          )}

                          {luminaire["Spécialité"] && (
                            <Badge variant="outline" className="text-xs">
                              {luminaire["Spécialité"]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Aucun luminaire</h3>
              <p className="text-gray-500">Aucun luminaire n'est associé à ce designer pour le moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
