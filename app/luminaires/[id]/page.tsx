"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Edit, Heart, Share2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import { LuminaireFormModal } from "@/components/LuminaireFormModal"
import { toast } from "sonner"

interface Luminaire {
  _id: string
  nom: string
  designer: string
  annee: string | number
  periode: string
  description: string
  collaboration: string
  signe: string
  editeur: string
  dimensions: string
  materiaux: string[]
  estimation: string
  images: string[]
  image: string
  designerImage: string
  designerImageFilename: string
  isFavorite: boolean
}

export default function LuminairePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [luminaire, setLuminaire] = useState<Luminaire | null>(null)
  const [similarLuminaires, setSimilarLuminaires] = useState<Luminaire[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchLuminaire(params.id as string)
    }
  }, [params.id])

  const fetchLuminaire = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/luminaires/${id}`)
      const data = await response.json()

      if (data.success) {
        setLuminaire(data.luminaire)
        setIsFavorite(data.luminaire.isFavorite || false)
        fetchSimilarLuminaires(data.luminaire)
      } else {
        toast.error("Luminaire non trouvé")
        router.push("/luminaires")
      }
    } catch (error) {
      console.error("Erreur lors du chargement du luminaire:", error)
      toast.error("Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const fetchSimilarLuminaires = async (currentLuminaire: Luminaire) => {
    try {
      const response = await fetch("/api/luminaires?limit=100")
      const data = await response.json()

      if (data.success) {
        // Algorithme de similarité ultra-précis
        const scored = data.luminaires
          .filter((l: Luminaire) => l._id !== currentLuminaire._id)
          .map((l: Luminaire) => {
            let score = 0

            // Score artiste identique : +50 points
            if (
              l.designer &&
              currentLuminaire.designer &&
              l.designer.toLowerCase() === currentLuminaire.designer.toLowerCase()
            ) {
              score += 50
            }

            // Score spécialité identique : +30 points
            if (
              l.periode &&
              currentLuminaire.periode &&
              l.periode.toLowerCase() === currentLuminaire.periode.toLowerCase()
            ) {
              score += 30
            }

            // Score matériaux communs : +15 points par matériau
            if (Array.isArray(l.materiaux) && Array.isArray(currentLuminaire.materiaux)) {
              const commonMaterials = l.materiaux.filter((m) =>
                currentLuminaire.materiaux.some(
                  (cm) => cm.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(cm.toLowerCase()),
                ),
              )
              score += commonMaterials.length * 15
            }

            // Score année : +25 pour année exacte, puis graduel jusqu'à ±20 ans
            if (l.annee && currentLuminaire.annee) {
              const yearDiff = Math.abs(Number(l.annee) - Number(currentLuminaire.annee))
              if (yearDiff === 0) score += 25
              else if (yearDiff <= 5) score += 20
              else if (yearDiff <= 10) score += 15
              else if (yearDiff <= 20) score += 10
            }

            // Bonus éditeur identique : +12 points
            if (
              l.editeur &&
              currentLuminaire.editeur &&
              l.editeur.toLowerCase() === currentLuminaire.editeur.toLowerCase()
            ) {
              score += 12
            }

            return { ...l, score }
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)

        setSimilarLuminaires(scored)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des luminaires similaires:", error)
    }
  }

  const handleEditSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/luminaires/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Luminaire modifié avec succès")
        fetchLuminaire(params.id as string)
        return { success: true }
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  const toggleFavorite = async () => {
    try {
      const response = await fetch(`/api/luminaires/${params.id}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !isFavorite }),
      })

      if (response.ok) {
        setIsFavorite(!isFavorite)
        toast.success(isFavorite ? "Retiré des favoris" : "Ajouté aux favoris")
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour des favoris")
    }
  }

  const shareItem = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: luminaire?.nom,
          text: `Découvrez ce luminaire : ${luminaire?.nom} par ${luminaire?.designer}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Partage annulé")
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Lien copié dans le presse-papiers")
    }
  }

  const nextImage = () => {
    if (luminaire?.images && luminaire.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % luminaire.images.length)
    }
  }

  const prevImage = () => {
    if (luminaire?.images && luminaire.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + luminaire.images.length) % luminaire.images.length)
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

  if (!luminaire) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Luminaire non trouvé</h1>
          <Button onClick={() => router.push("/luminaires")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la galerie
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header avec navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={shareItem}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleFavorite}>
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            {user?.role === "admin" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <DeleteLuminaireButton luminaireId={luminaire._id} onSuccess={() => router.push("/luminaires")} />
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-lg overflow-hidden shadow-lg">
              {luminaire.images && luminaire.images.length > 0 ? (
                <>
                  <Image
                    src={`/api/images/filename/${luminaire.images[currentImageIndex]}`}
                    alt={luminaire.nom}
                    fill
                    className="object-cover"
                    priority
                  />
                  {luminaire.images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                        onClick={nextImage}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <p className="text-gray-500">Aucune image disponible</p>
                </div>
              )}
            </div>

            {/* Miniatures */}
            {luminaire.images && luminaire.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {luminaire.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 ${
                      index === currentImageIndex ? "ring-2 ring-[#f2d895]" : ""
                    }`}
                  >
                    <Image
                      src={`/api/images/filename/${image}`}
                      alt={`${luminaire.nom} - ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section Informations */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{luminaire.nom}</h1>
              {luminaire.designer && (
                <Link
                  href={`/designers/${encodeURIComponent(luminaire.designer)}`}
                  className="text-lg text-gray-600 hover:text-[#f2d895] transition-colors"
                >
                  {luminaire.designer}
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {luminaire.annee && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Année</h3>
                  <p className="text-gray-600">{luminaire.annee}</p>
                </div>
              )}

              {luminaire.periode && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Spécialité</h3>
                  <p className="text-gray-600">{luminaire.periode}</p>
                </div>
              )}

              {luminaire.editeur && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Éditeur</h3>
                  <p className="text-gray-600">{luminaire.editeur}</p>
                </div>
              )}

              {luminaire.signe && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Signé</h3>
                  <p className="text-gray-600">{luminaire.signe}</p>
                </div>
              )}

              {luminaire.dimensions && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Dimensions</h3>
                  <p className="text-gray-600">{luminaire.dimensions}</p>
                </div>
              )}

              {luminaire.estimation && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Estimation</h3>
                  <p className="text-gray-600">{luminaire.estimation}</p>
                </div>
              )}
            </div>

            {luminaire.collaboration && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Collaboration / Œuvre</h3>
                <p className="text-gray-600 leading-relaxed">{luminaire.collaboration}</p>
              </div>
            )}

            {luminaire.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{luminaire.description}</p>
              </div>
            )}

            {/* Matériaux garantis avec fallback exhaustif */}
            {((Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) ||
              (luminaire as any).Matériaux ||
              (luminaire as any).materiaux) && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Matériaux</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0 ? (
                    luminaire.materiaux.map((materiau, index) => (
                      <Badge key={index} variant="secondary">
                        {materiau}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary">{(luminaire as any).Matériaux || (luminaire as any).materiaux}</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Image du designer */}
            {luminaire.designerImage && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Designer</h3>
                <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                  <Image
                    src={luminaire.designerImage || "/placeholder.svg"}
                    alt={`Photo de ${luminaire.designer}`}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section Luminaires similaires */}
        {similarLuminaires.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Luminaires similaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {similarLuminaires.map((similar) => (
                <Card key={similar._id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                  <Link href={`/luminaires/${similar._id}`}>
                    <div className="aspect-square relative overflow-hidden rounded-t-lg">
                      {similar.image ? (
                        <Image
                          src={similar.image || "/placeholder.svg"}
                          alt={similar.nom}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <p className="text-gray-400 text-sm">Pas d'image</p>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">{similar.nom}</h3>
                      <p className="text-xs text-gray-600 line-clamp-1">{similar.designer}</p>
                      {similar.annee && <p className="text-xs text-gray-500">{similar.annee}</p>}
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal d'édition */}
      <LuminaireFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </div>
  )
}
