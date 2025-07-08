"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Share2 } from "lucide-react"
import { Carousel } from "@/components/Carousel"
import { EditableField } from "@/components/EditableField"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"

interface Luminaire {
  _id: string
  nom: string
  designer: string
  annee: string
  editeur: string
  periode: string
  collaboration: string
  description: string
  signe: string
  dimensions: string
  materiaux: string[]
  estimation: string
  image: string | null
  designerImage: string | null
  images: string[]
  designerImageFilename: string | null
}

export default function LuminairePage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const { user } = useAuth()
  const [luminaire, setLuminaire] = useState<Luminaire | null>(null)
  const [similarLuminaires, setSimilarLuminaires] = useState<Luminaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchLuminaire()
      fetchSimilarLuminaires()
    }
  }, [params.id])

  const fetchLuminaire = async () => {
    try {
      const response = await fetch(`/api/luminaires/${params.id}`)
      if (!response.ok) {
        throw new Error("Luminaire non trouvé")
      }
      const data = await response.json()
      setLuminaire(data.luminaire)
    } catch (error) {
      console.error("Erreur:", error)
      setError("Impossible de charger le luminaire")
    } finally {
      setLoading(false)
    }
  }

  const fetchSimilarLuminaires = async () => {
    try {
      const response = await fetch("/api/luminaires")
      if (response.ok) {
        const data = await response.json()
        const allLuminaires = data.luminaires.filter((l: Luminaire) => l._id !== params.id)

        // Récupérer le luminaire actuel pour la comparaison
        const currentResponse = await fetch(`/api/luminaires/${params.id}`)
        if (currentResponse.ok) {
          const currentData = await currentResponse.json()
          const current = currentData.luminaire

          // Algorithme de similarité ultra-précis
          const scored = allLuminaires.map((luminaire: Luminaire) => {
            let score = 0

            // Score artiste identique (+50 points)
            if (
              current.designer &&
              luminaire.designer &&
              current.designer.toLowerCase() === luminaire.designer.toLowerCase()
            ) {
              score += 50
            }

            // Score spécialité identique (+30 points)
            if (
              current.periode &&
              luminaire.periode &&
              current.periode.toLowerCase() === luminaire.periode.toLowerCase()
            ) {
              score += 30
            }

            // Score matériaux communs (+15 points par matériau commun)
            if (current.materiaux && luminaire.materiaux) {
              const currentMat = current.materiaux.map((m: string) => m.toLowerCase())
              const lumMat = luminaire.materiaux.map((m: string) => m.toLowerCase())
              const commonMaterials = currentMat.filter((m: string) => lumMat.includes(m))
              score += commonMaterials.length * 15
            }

            // Score année (+25 pour année exacte, puis graduel jusqu'à ±20 ans)
            if (current.annee && luminaire.annee) {
              const currentYear = Number.parseInt(current.annee)
              const lumYear = Number.parseInt(luminaire.annee)
              if (!isNaN(currentYear) && !isNaN(lumYear)) {
                const yearDiff = Math.abs(currentYear - lumYear)
                if (yearDiff === 0) score += 25
                else if (yearDiff <= 5) score += 20
                else if (yearDiff <= 10) score += 15
                else if (yearDiff <= 15) score += 10
                else if (yearDiff <= 20) score += 5
              }
            }

            // Bonus éditeur identique (+12 points)
            if (
              current.editeur &&
              luminaire.editeur &&
              current.editeur.toLowerCase() === luminaire.editeur.toLowerCase()
            ) {
              score += 12
            }

            return { ...luminaire, score }
          })

          // Trier par score décroissant et prendre les 6 meilleurs
          const similar = scored
            .sort((a, b) => b.score - a.score)
            .filter((l) => l.score > 0) // Seulement ceux avec un score positif
            .slice(0, 6)

          setSimilarLuminaires(similar)
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des luminaires similaires:", error)
    }
  }

  const handleFieldUpdate = async (field: string, value: string) => {
    if (!luminaire) return

    try {
      const response = await fetch(`/api/luminaires/${luminaire._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })

      if (response.ok) {
        setLuminaire({ ...luminaire, [field]: value })
        showToast("Champ mis à jour avec succès", "success")
      } else {
        throw new Error("Erreur lors de la mise à jour")
      }
    } catch (error) {
      showToast("Erreur lors de la mise à jour", "error")
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: luminaire?.nom || "Luminaire",
          text: `Découvrez ce luminaire : ${luminaire?.nom} par ${luminaire?.designer}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Partage annulé")
      }
    } else {
      // Fallback : copier l'URL
      navigator.clipboard.writeText(window.location.href)
      showToast("Lien copié dans le presse-papiers", "success")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f2d895] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du luminaire...</p>
        </div>
      </div>
    )
  }

  if (error || !luminaire) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Luminaire non trouvé</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push("/luminaires")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la galerie
          </Button>
        </div>
      </div>
    )
  }

  // Construire les images pour le carousel
  const carouselImages = []
  if (luminaire.image) {
    carouselImages.push(luminaire.image)
  }
  if (luminaire.images && luminaire.images.length > 0) {
    luminaire.images.forEach((img) => {
      const imageUrl = `/api/images/filename/${encodeURIComponent(img)}`
      if (!carouselImages.includes(imageUrl)) {
        carouselImages.push(imageUrl)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header avec navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => router.push("/luminaires")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour à la galerie
          </Button>

          <div className="flex items-center gap-2">
            <FavoriteToggleButton luminaireId={luminaire._id} />
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            {user?.role === "admin" && (
              <DeleteLuminaireButton luminaireId={luminaire._id} onSuccess={() => router.push("/luminaires")} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche - Images */}
          <div className="space-y-6">
            {carouselImages.length > 0 ? (
              <Carousel images={carouselImages} />
            ) : (
              <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Aucune image disponible</p>
              </div>
            )}

            {/* Image du designer */}
            {luminaire.designerImage && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold mb-3">Portrait de l'artiste</h3>
                <img
                  src={luminaire.designerImage || "/placeholder.svg"}
                  alt={`Portrait de ${luminaire.designer}`}
                  className="w-full max-w-xs mx-auto rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Colonne droite - Informations */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* 1. Nom du luminaire */}
                  <div>
                    <EditableField
                      label="Nom du luminaire"
                      value={luminaire.nom}
                      onSave={(value) => handleFieldUpdate("nom", value)}
                      canEdit={user?.role === "admin"}
                      className="text-2xl font-bold text-gray-900"
                    />
                  </div>

                  {/* 2. Artiste / Dates */}
                  <div>
                    <Link
                      href={`/designers/${encodeURIComponent(luminaire.designer)}`}
                      className="text-lg text-[#8B4513] hover:text-[#A0522D] transition-colors"
                    >
                      <EditableField
                        label="Artiste / Dates"
                        value={luminaire.designer}
                        onSave={(value) => handleFieldUpdate("designer", value)}
                        canEdit={user?.role === "admin"}
                        className="text-lg text-[#8B4513]"
                      />
                    </Link>
                  </div>

                  {/* 3. Année */}
                  <div>
                    <EditableField
                      label="Année"
                      value={luminaire.annee}
                      onSave={(value) => handleFieldUpdate("annee", value)}
                      canEdit={user?.role === "admin"}
                      className="text-gray-700"
                    />
                  </div>

                  {/* 4. Éditeur */}
                  {luminaire.editeur && (
                    <div>
                      <EditableField
                        label="Éditeur"
                        value={luminaire.editeur}
                        onSave={(value) => handleFieldUpdate("editeur", value)}
                        canEdit={user?.role === "admin"}
                        className="text-gray-700"
                      />
                    </div>
                  )}

                  {/* 5. Spécialité */}
                  {luminaire.periode && (
                    <div>
                      <EditableField
                        label="Spécialité"
                        value={luminaire.periode}
                        onSave={(value) => handleFieldUpdate("periode", value)}
                        canEdit={user?.role === "admin"}
                        className="text-gray-700"
                      />
                    </div>
                  )}

                  {/* 6. Collaboration / Œuvre */}
                  {luminaire.collaboration && (
                    <div>
                      <EditableField
                        label="Collaboration / Œuvre"
                        value={luminaire.collaboration}
                        onSave={(value) => handleFieldUpdate("collaboration", value)}
                        canEdit={user?.role === "admin"}
                        className="text-gray-700"
                      />
                    </div>
                  )}

                  {/* 7. Description */}
                  {luminaire.description && (
                    <div>
                      <EditableField
                        label="Description"
                        value={luminaire.description}
                        onSave={(value) => handleFieldUpdate("description", value)}
                        canEdit={user?.role === "admin"}
                        multiline
                        className="text-gray-700"
                      />
                    </div>
                  )}

                  {/* 8. Matériaux - Affichage garanti */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Matériaux</label>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        // Priorité aux nouveaux formats (tableaux)
                        if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
                          return luminaire.materiaux.map((materiau, index) => (
                            <Badge key={index} variant="secondary" className="bg-[#f2d895] text-gray-800">
                              {materiau}
                            </Badge>
                          ))
                        }

                        // Fallback exhaustif sur les anciens formats textuels
                        const fallbackMateriau = (luminaire as any).Matériaux || (luminaire as any).materiaux
                        if (fallbackMateriau && typeof fallbackMateriau === "string" && fallbackMateriau.trim()) {
                          return fallbackMateriau.split(",").map((materiau: string, index: number) => (
                            <Badge key={index} variant="secondary" className="bg-[#f2d895] text-gray-800">
                              {materiau.trim()}
                            </Badge>
                          ))
                        }

                        return <span className="text-gray-500 italic">Non spécifié</span>
                      })()}
                    </div>
                  </div>

                  {/* 9. Signé */}
                  {luminaire.signe && (
                    <div>
                      <EditableField
                        label="Signé"
                        value={luminaire.signe}
                        onSave={(value) => handleFieldUpdate("signe", value)}
                        canEdit={user?.role === "admin"}
                        className="text-gray-700"
                      />
                    </div>
                  )}

                  {/* 10. Dimensions */}
                  {luminaire.dimensions && (
                    <div>
                      <EditableField
                        label="Dimensions"
                        value={luminaire.dimensions}
                        onSave={(value) => handleFieldUpdate("dimensions", value)}
                        canEdit={user?.role === "admin"}
                        className="text-gray-700"
                      />
                    </div>
                  )}

                  {/* 11. Estimation */}
                  {luminaire.estimation && (
                    <div>
                      <EditableField
                        label="Estimation"
                        value={luminaire.estimation}
                        onSave={(value) => handleFieldUpdate("estimation", value)}
                        canEdit={user?.role === "admin"}
                        className="text-gray-700 font-semibold"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section des luminaires similaires */}
        {similarLuminaires.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Luminaires similaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {similarLuminaires.map((similar) => (
                <Link key={similar._id} href={`/luminaires/${similar._id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-gray-200 rounded-lg mb-3 overflow-hidden">
                        {similar.image ? (
                          <img
                            src={similar.image || "/placeholder.svg"}
                            alt={similar.nom}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            Pas d'image
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">{similar.nom}</h3>
                      <p className="text-xs text-gray-600 line-clamp-1">{similar.designer}</p>
                      <p className="text-xs text-gray-500">{similar.annee}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
