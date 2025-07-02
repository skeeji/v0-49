"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Edit, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbox } from "@/components/Lightbox"
import { EditableField } from "@/components/EditableField"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

interface Luminaire {
  _id: string
  nom?: string
  "Nom de l'objet"?: string
  designer?: string
  "Artiste / Dates"?: string
  annee?: number
  year?: number
  Année?: number
  description?: string
  "Description / Commentaire"?: string
  dimensions?: string
  "Dimensions (H x L x P en cm)"?: string
  materiaux?: string
  Matériaux?: string
  couleur?: string
  "Couleur dominante"?: string
  style?: string
  "Style / Mouvement"?: string
  prix?: number
  "Prix (estimation en €)"?: number
  images?: string[]
  isFavorite?: boolean
  createdAt?: string
  updatedAt?: string
}

export default function LuminairePage() {
  const params = useParams()
  const router = useRouter()
  const { userData } = useAuth()
  const [luminaire, setLuminaire] = useState<Luminaire | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<Partial<Luminaire>>({})
  const [saving, setSaving] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const isAdmin = userData?.role === "admin"

  useEffect(() => {
    const loadLuminaire = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/luminaires/${params.id}`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.luminaire) {
          setLuminaire(data.luminaire)
          setEditedData(data.luminaire)
        } else if (data.success && data.data) {
          setLuminaire(data.data)
          setEditedData(data.data)
        } else {
          setError(data.error || "Luminaire non trouvé")
        }
      } catch (err: any) {
        console.error("❌ Erreur chargement luminaire:", err)
        setError(err.message || "Erreur lors du chargement")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadLuminaire()
    }
  }, [params.id])

  const handleSave = async () => {
    if (!luminaire) return

    try {
      setSaving(true)
      const response = await fetch(`/api/luminaires/${luminaire._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedData),
      })

      const data = await response.json()

      if (data.success) {
        setLuminaire({ ...luminaire, ...editedData })
        setIsEditing(false)
        toast.success("Luminaire mis à jour avec succès")
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      console.error("❌ Erreur sauvegarde:", err)
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedData(luminaire || {})
    setIsEditing(false)
  }

  const handleDelete = () => {
    router.push("/luminaires")
  }

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index)
    setLightboxOpen(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement du luminaire...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur: {error}</p>
          <Button onClick={() => router.push("/luminaires")}>Retour aux luminaires</Button>
        </div>
      </div>
    )
  }

  if (!luminaire) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Luminaire non trouvé</p>
          <Button onClick={() => router.push("/luminaires")}>Retour aux luminaires</Button>
        </div>
      </div>
    )
  }

  const images = luminaire.images || []
  const nom = luminaire.nom || luminaire["Nom de l'objet"] || "Sans nom"
  const designer = luminaire.designer || luminaire["Artiste / Dates"] || "Designer inconnu"
  const annee = luminaire.annee || luminaire.year || luminaire["Année"]
  const description = luminaire.description || luminaire["Description / Commentaire"]
  const dimensions = luminaire.dimensions || luminaire["Dimensions (H x L x P en cm)"]
  const materiaux = luminaire.materiaux || luminaire["Matériaux"]
  const couleur = luminaire.couleur || luminaire["Couleur dominante"]
  const style = luminaire.style || luminaire["Style / Mouvement"]
  const prix = luminaire.prix || luminaire["Prix (estimation en €)"]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>

        <div className="flex items-center gap-2">
          <FavoriteToggleButton luminaireId={luminaire._id} initialFavorite={luminaire.isFavorite} />

          {isAdmin && (
            <>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              )}

              <DeleteLuminaireButton luminaireId={luminaire._id} onDelete={handleDelete} />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          {images.length > 0 ? (
            <>
              <div
                className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => openLightbox(0)}
              >
                <Image
                  src={`/api/images/${images[0]}`}
                  alt={nom}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              </div>

              {images.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.slice(1, 4).map((imageId, index) => (
                    <div
                      key={imageId}
                      className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => openLightbox(index + 1)}
                    >
                      <Image
                        src={`/api/images/${imageId}`}
                        alt={`${nom} - Image ${index + 2}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                      {index === 2 && images.length > 4 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="text-white font-medium">+{images.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Aucune image disponible</p>
            </div>
          )}
        </div>

        {/* Informations - Scrollable sur mobile */}
        <div className="space-y-6 max-h-screen overflow-y-auto lg:max-h-none lg:overflow-visible">
          <div>
            <EditableField
              label="Nom"
              value={isEditing ? editedData.nom || editedData["Nom de l'objet"] || "" : nom}
              isEditing={isEditing}
              onChange={(value) => setEditedData({ ...editedData, nom: value })}
              className="text-3xl font-serif text-gray-900 mb-2"
            />

            <EditableField
              label="Designer"
              value={isEditing ? editedData.designer || editedData["Artiste / Dates"] || "" : designer}
              isEditing={isEditing}
              onChange={(value) => setEditedData({ ...editedData, designer: value })}
              className="text-xl text-gray-600 mb-4"
            />

            {annee && (
              <Badge variant="secondary" className="mb-4">
                {String(annee)}
              </Badge>
            )}
          </div>

          {description && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Description</h3>
                <EditableField
                  label="Description"
                  value={
                    isEditing ? editedData.description || editedData["Description / Commentaire"] || "" : description
                  }
                  isEditing={isEditing}
                  onChange={(value) => setEditedData({ ...editedData, description: value })}
                  multiline
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Caractéristiques</h3>
              <div className="space-y-3">
                {dimensions && (
                  <div>
                    <span className="font-medium text-gray-700">Dimensions:</span>
                    <EditableField
                      label="Dimensions"
                      value={
                        isEditing
                          ? editedData.dimensions || editedData["Dimensions (H x L x P en cm)"] || ""
                          : dimensions
                      }
                      isEditing={isEditing}
                      onChange={(value) => setEditedData({ ...editedData, dimensions: value })}
                      className="ml-2"
                    />
                  </div>
                )}

                {materiaux && (
                  <div>
                    <span className="font-medium text-gray-700">Matériaux:</span>
                    <EditableField
                      label="Matériaux"
                      value={isEditing ? editedData.materiaux || editedData["Matériaux"] || "" : materiaux}
                      isEditing={isEditing}
                      onChange={(value) => setEditedData({ ...editedData, materiaux: value })}
                      className="ml-2"
                    />
                  </div>
                )}

                {couleur && (
                  <div>
                    <span className="font-medium text-gray-700">Couleur:</span>
                    <EditableField
                      label="Couleur"
                      value={isEditing ? editedData.couleur || editedData["Couleur dominante"] || "" : couleur}
                      isEditing={isEditing}
                      onChange={(value) => setEditedData({ ...editedData, couleur: value })}
                      className="ml-2"
                    />
                  </div>
                )}

                {style && (
                  <div>
                    <span className="font-medium text-gray-700">Style:</span>
                    <EditableField
                      label="Style"
                      value={isEditing ? editedData.style || editedData["Style / Mouvement"] || "" : style}
                      isEditing={isEditing}
                      onChange={(value) => setEditedData({ ...editedData, style: value })}
                      className="ml-2"
                    />
                  </div>
                )}

                {prix && (
                  <div>
                    <span className="font-medium text-gray-700">Prix estimé:</span>
                    <EditableField
                      label="Prix"
                      value={
                        isEditing ? String(editedData.prix || editedData["Prix (estimation en €)"] || "") : `${prix} €`
                      }
                      isEditing={isEditing}
                      onChange={(value) => setEditedData({ ...editedData, prix: Number(value) })}
                      className="ml-2"
                      type="number"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <Lightbox
          images={images.map((id) => `/api/images/${id}`)}
          currentIndex={currentImageIndex}
          onClose={() => setLightboxOpen(false)}
          onNext={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
          onPrev={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
        />
      )}
    </div>
  )
}
