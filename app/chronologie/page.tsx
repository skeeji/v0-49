"use client"
import { useState, useEffect } from "react"
import { TimelineBlock } from "@/components/TimelineBlock"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Calendar, ImageIcon } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

interface TimelinePeriod {
  name: string
  start: number
  end: number
  description: string
  luminaires: any[]
  imageUrl?: string
}

export default function ChronologiePage() {
  const [timelineData, setTimelineData] = useState<TimelinePeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({})

  const { userData } = useAuth()
  const isAdmin = userData?.role === "admin"

  useEffect(() => {
    loadTimelineData()
  }, [])

  const loadTimelineData = async () => {
    try {
      // Charger les luminaires
      const luminairesResponse = await fetch("/api/luminaires")
      const luminairesData = await luminairesResponse.json()

      // Charger les images de périodes
      const imagesResponse = await fetch("/api/period-images")
      const imagesData = await imagesResponse.json()

      const periodImages = imagesData.success ? imagesData.images : {}

      if (luminairesData.success) {
        const luminaires = luminairesData.luminaires

        // Définir les périodes historiques
        const periods = [
          { name: "Moyen-Age", start: 500, end: 1500, description: "" },
          { name: "Renaissance", start: 1400, end: 1600, description: "" },
          { name: "Baroque", start: 1600, end: 1750, description: "" },
          { name: "Néoclassique", start: 1750, end: 1850, description: "" },
          { name: "Art Nouveau", start: 1890, end: 1910, description: "" },
          { name: "Art Déco", start: 1920, end: 1940, description: "" },
          { name: "Moderne", start: 1940, end: 1980, description: "" },
          { name: "Contemporain", start: 1980, end: 2024, description: "" },
        ]

        // Charger les descriptions depuis l'API
        const descriptionsResponse = await fetch("/api/timeline/descriptions")
        const descriptionsData = await descriptionsResponse.json()
        const descriptions = descriptionsData.success ? descriptionsData.descriptions : {}

        const timeline = periods.map((period) => {
          const periodLuminaires = luminaires.filter((luminaire: any) => {
            const year = luminaire.annee || luminaire["Année"] || 0
            return year >= period.start && year <= period.end
          })

          return {
            ...period,
            description: descriptions[period.name] || period.description,
            luminaires: periodLuminaires.map((luminaire: any) => ({
              id: luminaire._id,
              name: luminaire.nom || luminaire["Nom du luminaire"] || "Sans nom",
              artist: luminaire.designer || luminaire["Designer"] || "",
              year: luminaire.annee || luminaire["Année"] || "",
              image: luminaire.image || "",
            })),
            imageUrl: periodImages[period.name] || undefined,
          }
        })

        setTimelineData(timeline)
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la chronologie:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDescriptionUpdate = async (periodName: string, newDescription: string) => {
    try {
      const response = await fetch("/api/timeline/descriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodName,
          description: newDescription,
        }),
      })

      if (response.ok) {
        setTimelineData((prev) =>
          prev.map((period) => (period.name === periodName ? { ...period, description: newDescription } : period)),
        )
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la description:", error)
    }
  }

  const handleImageUpload = async (periodName: string, file: File) => {
    setUploadingImages((prev) => ({ ...prev, [periodName]: true }))

    try {
      console.log(`🖼️ Upload image pour période: ${periodName}`)

      const formData = new FormData()
      formData.append("image", file)
      formData.append("periodName", periodName)

      const response = await fetch("/api/upload/period-images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API image période:", result)

      if (result.success) {
        // Recharger les données pour obtenir la nouvelle image
        await loadTimelineData()
        console.log("✅ Image uploadée et timeline rechargée")
      } else {
        console.error("❌ Erreur upload image:", result.message)
      }
    } catch (error) {
      console.error("💥 Erreur lors de l'upload de l'image:", error)
    } finally {
      setUploadingImages((prev) => ({ ...prev, [periodName]: false }))
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 mx-auto mb-4"
              style={{ borderTopColor: "#d4a574" }}
            ></div>
            <p className="text-gray-600">Chargement de la chronologie...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-serif text-gray-900 mb-4">Chronologie des Luminaires</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Découvrez l'évolution des luminaires à travers les époques, du Moyen-Âge à nos jours
        </p>
      </div>

      {/* Section d'upload d'images pour les admins */}
      {isAdmin && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Gestion des images de périodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {timelineData.map((period) => (
                <div key={period.name} className="space-y-2">
                  <Label htmlFor={`upload-${period.name}`} className="text-sm font-medium">
                    {period.name}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`upload-${period.name}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleImageUpload(period.name, file)
                        }
                      }}
                      className="hidden"
                    />
                    <Button
                      onClick={() => document.getElementById(`upload-${period.name}`)?.click()}
                      variant="outline"
                      size="sm"
                      disabled={uploadingImages[period.name]}
                      className="flex-1"
                    >
                      {uploadingImages[period.name] ? (
                        <>
                          <div
                            className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 mr-2"
                            style={{ borderTopColor: "#d4a574" }}
                          ></div>
                          Upload...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {period.imageUrl ? "Changer" : "Ajouter"}
                        </>
                      )}
                    </Button>
                  </div>
                  {period.imageUrl && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Image présente
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <div className="relative">
        {timelineData.map((period, index) => (
          <TimelineBlock
            key={period.name}
            period={period}
            isLeft={index % 2 === 0}
            className="mb-16"
            onDescriptionUpdate={handleDescriptionUpdate}
          />
        ))}
      </div>
    </div>
  )
}
