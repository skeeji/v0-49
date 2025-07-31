"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Heart, HeartOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EditableField } from "@/components/EditableField"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

export default function LuminaireDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [luminaire, setLuminaire] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const { userData } = useAuth()
  const { toast } = useToast()

  const canEdit = userData?.role === "admin"

  useEffect(() => {
    if (!params.id) return

    async function fetchLuminaire() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/luminaires/${params.id}`)
        const result = await response.json()

        if (result.success) {
          console.log("🔍 Données luminaire reçues:", result.data)

          // Adapter les données avec la logique de secours
          const adaptedData = {
            ...result.data,
            // LOGIQUE CORRIGÉE POUR SPÉCIALITÉ
            specialty: (() => {
              // D'abord chercher dans 'periode'
              if (result.data.periode && String(result.data.periode).trim() !== "") {
                return String(result.data.periode).trim()
              }
              // Sinon chercher dans 'Spécialité'
              if (result.data["Spécialité"] && String(result.data["Spécialité"]).trim() !== "") {
                return String(result.data["Spécialité"]).trim()
              }
              return ""
            })(),

            // LOGIQUE CORRIGÉE POUR COLLABORATION / ŒUVRE
            collaboration: (() => {
              // D'abord chercher dans 'collaboration'
              if (result.data.collaboration && String(result.data.collaboration).trim() !== "") {
                return String(result.data.collaboration).trim()
              }
              // Sinon chercher dans 'Collaboration / Œuvre'
              if (result.data["Collaboration / Œuvre"] && String(result.data["Collaboration / Œuvre"]).trim() !== "") {
                return String(result.data["Collaboration / Œuvre"]).trim()
              }
              return ""
            })(),

            // LOGIQUE CORRIGÉE POUR MATÉRIAUX
            materials: (() => {
              // D'abord chercher dans 'materiaux' (modifié)
              if (result.data.materiaux) {
                if (Array.isArray(result.data.materiaux) && result.data.materiaux.length > 0) {
                  return result.data.materiaux.join("; ")
                } else if (typeof result.data.materiaux === "string" && result.data.materiaux.trim() !== "") {
                  return result.data.materiaux.trim()
                }
              }
              // Sinon chercher dans 'Matériaux' (original)
              if (result.data["Matériaux"]) {
                if (Array.isArray(result.data["Matériaux"]) && result.data["Matériaux"].length > 0) {
                  return result.data["Matériaux"].join("; ")
                } else if (typeof result.data["Matériaux"] === "string" && result.data["Matériaux"].trim() !== "") {
                  return result.data["Matériaux"].trim()
                }
              }
              return ""
            })(),

            name: result.data["Nom luminaire"] || result.data.nom || "Sans nom",
            artist: result.data["Artiste / Dates"] || result.data.designer || "",
            year: result.data["Année"] || result.data.annee || "",
            editor: result.data["Editeur"] || result.data.editeur || "",
            description: result.data["Description"] || result.data.description || "",
            dimensions: result.data["Dimensions"] || result.data.dimensions || "",
            estimation: result.data["Estimation"] || result.data.estimation || result.data.prix || "",
            signed: result.data["Signé"] || result.data.signe || "",
            image: result.data.filename ? `/api/images/filename/${result.data.filename}` : null,
          }

          console.log("✅ Données adaptées:", adaptedData)
          setLuminaire(adaptedData)

          // Vérifier si c'est un favori
          const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
          setIsFavorite(favorites.includes(params.id))
        } else {
          console.error("❌ Erreur API:", result.error)
          setLuminaire(null)
        }
      } catch (error) {
        console.error("❌ Erreur chargement luminaire:", error)
        setLuminaire(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLuminaire()
  }, [params.id])

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
    let newFavorites

    if (isFavorite) {
      newFavorites = favorites.filter((id: string) => id !== params.id)
    } else {
      newFavorites = [...favorites, params.id]
    }

    localStorage.setItem("favorites", JSON.stringify(newFavorites))
    setIsFavorite(!isFavorite)

    toast({
      title: isFavorite ? "Retiré des favoris" : "Ajouté aux favoris",
      description: isFavorite ? "Le luminaire a été retiré de vos favoris" : "Le luminaire a été ajouté à vos favoris",
    })
  }

  const updateField = async (field: string, value: any) => {
    if (!canEdit) return

    try {
      console.log(`🔄 Mise à jour ${field}:`, value)

      const response = await fetch(`/api/luminaires/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: value }),
      })

      const result = await response.json()

      if (result.success) {
        console.log(`✅ ${field} mis à jour avec succès`)
        setLuminaire((prev: any) => ({ ...prev, [field]: value }))
        toast({
          title: "✅ Modification enregistrée",
          description: `Le champ ${field} a été mis à jour`,
        })
      } else {
        console.error(`❌ Erreur mise à jour ${field}:`, result.error)
        toast({
          title: "❌ Erreur",
          description: `Impossible de mettre à jour ${field}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`❌ Erreur critique mise à jour ${field}:`, error)
      toast({
        title: "❌ Erreur critique",
        description: `Erreur lors de la mise à jour de ${field}`,
        variant: "destructive",
      })
    }
  }

  const downloadPDF = async () => {
    try {
      const response = await fetch(`/api/luminaires/${params.id}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `${luminaire.name || "luminaire"}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "✅ PDF téléchargé",
          description: "Le PDF du luminaire a été téléchargé",
        })
      } else {
        throw new Error("Erreur lors du téléchargement")
      }
    } catch (error) {
      console.error("❌ Erreur téléchargement PDF:", error)
      toast({
        title: "❌ Erreur",
        description: "Impossible de télécharger le PDF",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 font-serif">Chargement...</div>
  }

  if (!luminaire) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="font-serif">Luminaire non trouvé.</p>
        <Link href="/luminaires">
          <Button className="mt-4">Retour à la galerie</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/luminaires">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent font-serif">
              <ArrowLeft className="w-4 h-4" />
              Retour à la galerie
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Button onClick={toggleFavorite} variant="outline" size="sm">
              {isFavorite ? <HeartOff className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
              {isFavorite ? "Retirer" : "Favoris"}
            </Button>

            <Button onClick={downloadPDF} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>

            {canEdit && (
              <DeleteLuminaireButton
                luminaireId={params.id as string}
                luminaireName={luminaire.name}
                onDelete={() => router.push("/luminaires")}
              />
            )}
          </div>
        </div>

        {!canEdit && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="font-serif">
              Mode lecture seule. Seuls les administrateurs peuvent modifier les informations.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                  {luminaire.image ? (
                    <Image
                      src={luminaire.image || "/placeholder.svg"}
                      alt={luminaire.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        console.log("❌ Erreur chargement image:", luminaire.image)
                        e.currentTarget.style.display = "none"
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                        if (nextElement) {
                          nextElement.classList.remove("hidden")
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${luminaire.image ? "hidden" : ""}`}
                  >
                    <div className="text-center">
                      <div className="text-6xl text-gray-400 mb-2">🖼️</div>
                      <span className="text-gray-500 font-serif">Image non disponible</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Informations */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif text-gray-900 mb-2">
                <EditableField
                  value={luminaire.name}
                  onSave={(value) => updateField("nom", value)}
                  placeholder="Nom du luminaire"
                  disabled={!canEdit}
                />
              </h1>

              <div className="flex flex-wrap gap-2 mb-4">
                {luminaire.signed && <Badge variant="secondary">Signé</Badge>}
                {luminaire.year && <Badge variant="outline">{luminaire.year}</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Artiste / Dates</h3>
                <EditableField
                  value={luminaire.artist}
                  onSave={(value) => updateField("designer", value)}
                  placeholder="Nom de l'artiste"
                  disabled={!canEdit}
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Année</h3>
                <EditableField
                  value={luminaire.year}
                  onSave={(value) => updateField("annee", value)}
                  placeholder="Année de création"
                  disabled={!canEdit}
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Éditeur</h3>
                <EditableField
                  value={luminaire.editor}
                  onSave={(value) => updateField("editeur", value)}
                  placeholder="Nom de l'éditeur"
                  disabled={!canEdit}
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Spécialité</h3>
                <EditableField
                  value={luminaire.specialty}
                  onSave={(value) => updateField("periode", value)}
                  placeholder="Spécialité ou période"
                  disabled={!canEdit}
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Collaboration / Œuvre</h3>
                <EditableField
                  value={luminaire.collaboration}
                  onSave={(value) => updateField("collaboration", value)}
                  placeholder="Collaboration ou œuvre"
                  multiline
                  disabled={!canEdit}
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Matériaux</h3>
                <EditableField
                  value={luminaire.materials}
                  onSave={(value) => updateField("materiaux", value)}
                  placeholder="Matériaux utilisés"
                  multiline
                  disabled={!canEdit}
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Dimensions</h3>
                <EditableField
                  value={luminaire.dimensions}
                  onSave={(value) => updateField("dimensions", value)}
                  placeholder="Dimensions"
                  disabled={!canEdit}
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Estimation</h3>
                <EditableField
                  value={luminaire.estimation}
                  onSave={(value) => updateField("estimation", value)}
                  placeholder="Estimation"
                  disabled={!canEdit}
                />
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <EditableField
                  value={luminaire.description}
                  onSave={(value) => updateField("description", value)}
                  placeholder="Description détaillée"
                  multiline
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
