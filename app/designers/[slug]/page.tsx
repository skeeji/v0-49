"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, User, Calendar, Palette, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface Designer {
  nom: string
  imagedesigner?: string
  luminaires: any[]
  totalLuminaires: number
}

export default function DesignerDetailPage() {
  const params = useParams()
  const [designer, setDesigner] = useState<Designer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const slug = params.slug as string

  useEffect(() => {
    const fetchDesigner = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log(`🔍 Chargement du designer: ${slug}`)

        const response = await fetch(`/api/designers/${encodeURIComponent(slug)}`)
        const data = await response.json()

        console.log("📊 Réponse API designer:", data)

        if (data.success) {
          setDesigner(data.designer)
        } else {
          setError(data.message || "Designer non trouvé")
        }
      } catch (error) {
        console.error("❌ Erreur API:", error)
        setError("Erreur lors du chargement")
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
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />

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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !designer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Designer non trouvé</h1>
          <p className="text-gray-600 mb-6">{error || "Ce designer n'existe pas ou n'a pas été trouvé."}</p>
          <Link href="/designers">
            <Button>
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
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/designers" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux designers
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Profil du designer */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {/* Photo du designer */}
                <div className="relative w-full h-64 mb-6 bg-gray-100 rounded-lg overflow-hidden">
                  {designer.imagedesigner ? (
                    <Image
                      src={`/api/images/filename/${designer.imagedesigner}`}
                      alt={designer.nom}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=300&width=300&text=Designer"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                      <User className="w-20 h-20 text-blue-400" />
                    </div>
                  )}
                </div>

                {/* Informations du designer */}
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{designer.nom}</h1>

                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Palette className="w-3 h-3" />
                      Designer
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {designer.totalLuminaires} luminaire{designer.totalLuminaires > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Luminaires du designer */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Luminaires ({designer.totalLuminaires})</h2>
            </div>

            {designer.luminaires.length === 0 ? (
              <div className="text-center py-12">
                <Palette className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Aucun luminaire</h3>
                <p className="text-gray-500">Ce designer n'a pas encore de luminaires dans la collection</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {designer.luminaires.map((luminaire, index) => (
                  <Link key={index} href={`/luminaires/${luminaire._id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                      <CardContent className="p-0">
                        {/* Image du luminaire */}
                        <div className="relative w-full h-48 bg-gray-100">
                          {luminaire.image ? (
                            <Image
                              src={luminaire.image || "/placeholder.svg"}
                              alt={luminaire["Nom luminaire"] || "Luminaire"}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg?height=200&width=200&text=Luminaire"
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-100 to-orange-100">
                              <Palette className="w-12 h-12 text-yellow-400" />
                            </div>
                          )}
                        </div>

                        {/* Informations du luminaire */}
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {luminaire["Nom luminaire"] || "Sans nom"}
                          </h3>

                          <div className="space-y-1 text-sm text-gray-600">
                            {luminaire["Année"] && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                <span>{luminaire["Année"]}</span>
                              </div>
                            )}

                            {luminaire["Spécialité"] && (
                              <div className="flex items-center gap-2">
                                <Palette className="w-3 h-3" />
                                <span className="line-clamp-1">{luminaire["Spécialité"]}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {luminaire["Signé"] === "Oui" ? "Signé" : "Non signé"}
                            </Badge>

                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
