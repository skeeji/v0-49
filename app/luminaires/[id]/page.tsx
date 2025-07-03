"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { useAuth } from "@/contexts/AuthContext"
import jsPDF from "jspdf"

export default function LuminaireDetailPage() {
  const params = useParams()
  const [luminaire, setLuminaire] = useState<any>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [similarLuminaires, setSimilarLuminaires] = useState<any[]>([])
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userData, loading: authLoading } = useAuth()

  const canEdit = !authLoading && userData?.role === "admin"

  useEffect(() => {
    if (!params.id) return

    async function fetchLuminaireData() {
      setIsLoading(true)
      setError(null)

      try {
        console.log("🔍 Chargement luminaire ID:", params.id)

        const response = await fetch(`/api/luminaires/${params.id}`)
        const result = await response.json()

        console.log("📊 Réponse API luminaire:", result)

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Luminaire non trouvé")
        }

        const data = result.data
        const formattedLuminaire = {
          _id: String(data._id || ""),
          id: String(data._id || ""),
          nom: String(data.nom || ""),
          designer: String(data.designer || ""),
          periode: String(data.periode || ""),
          collaboration: String(data.collaboration || ""),
          description: String(data.description || ""),
          editeur: String(data.editeur || ""),
          annee: data.annee ? String(data.annee) : "",
          signe: String(data.signe || ""),
          dimensions: String(data.dimensions || ""),
          materiaux: Array.isArray(data.materiaux) ? data.materiaux : [],
          estimation: String(data.estimation || ""),
          image: data.image || null,
          designerImage: data.designerImage || null,
        }

        setLuminaire(formattedLuminaire)
        console.log("✅ Luminaire formaté:", formattedLuminaire)

        // Charger les luminaires similaires
        if (formattedLuminaire.periode || formattedLuminaire.materiaux.length > 0) {
          const similarParams = new URLSearchParams({
            id: formattedLuminaire.id,
            periode: formattedLuminaire.periode,
            materiaux: formattedLuminaire.materiaux.join(","),
          })

          const similarResponse = await fetch(`/api/luminaires/similar?${similarParams}`)
          const similarResult = await similarResponse.json()

          if (similarResult.success && Array.isArray(similarResult.similar)) {
            setSimilarLuminaires(similarResult.similar)
            console.log("✅ Luminaires similaires:", similarResult.similar.length)
          }
        }

        // Charger les favoris
        const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
        setIsFavorite(favorites.includes(String(params.id)))
      } catch (error: any) {
        console.error("❌ Erreur chargement:", error)
        setError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLuminaireData()
  }, [params.id])

  const handleUpdate = async (field: string, value: string) => {
    if (!canEdit || !luminaire) return

    const keyMapping: { [key: string]: string } = {
      nom: "nom",
      designer: "designer",
      periode: "periode",
      collaboration: "collaboration",
      description: "description",
      editeur: "editeur",
      annee: "annee",
      signe: "signe",
      dimensions: "dimensions",
      estimation: "estimation",
    }

    const keyToUpdate = keyMapping[field] || field

    setLuminaire((prev: any) => ({ ...prev, [field]: String(value) }))

    try {
      await fetch(`/api/luminaires/${luminaire._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [keyToUpdate]: value }),
      })
      console.log("✅ Luminaire mis à jour:", field, value)
    } catch (error) {
      console.error("❌ Erreur de mise à jour:", error)
    }
  }

  const toggleFavorite = () => {
    if (!luminaire) return

    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
    const newFavorites = isFavorite
      ? favorites.filter((id: string) => String(id) !== String(luminaire._id))
      : [...favorites, String(luminaire._id)]

    localStorage.setItem("favorites", JSON.stringify(newFavorites))
    setIsFavorite(!isFavorite)
  }

  const generatePDF = async () => {
    if (!luminaire) return

    setGeneratingPDF(true)

    try {
      const pdf = new jsPDF()

      // Titre
      pdf.setFontSize(20)
      pdf.text(String(luminaire.nom || "Luminaire sans nom"), 20, 30)

      // Informations
      pdf.setFontSize(12)
      let yPos = 50

      const addField = (label: string, value: string) => {
        const cleanValue = String(value || "").trim()
        if (cleanValue && cleanValue !== "[object Object]") {
          const lines = pdf.splitTextToSize(`${label}: ${cleanValue}`, 170)
          pdf.text(lines, 20, yPos)
          yPos += lines.length * 7
        }
      }

      addField("Nom", luminaire.nom)
      addField("Artiste / Dates", luminaire.designer)
      addField("Spécialité", luminaire.periode)
      addField("Collaboration / Œuvre", luminaire.collaboration)
      addField("Description", luminaire.description)
      addField("Editeur", luminaire.editeur)
      addField("Année", luminaire.annee)
      addField("Signé", luminaire.signe)
      addField("Dimensions", luminaire.dimensions)
      addField("Matériaux", luminaire.materiaux.join(", "))
      addField("Estimation", luminaire.estimation)

      // Sauvegarder le PDF
      pdf.save(`${String(luminaire.nom || "luminaire")}.pdf`)
    } catch (error) {
      console.error("❌ Erreur génération PDF:", error)
    } finally {
      setGeneratingPDF(false)
    }
  }

  const createDesignerSlug = (designerName: string) => {
    return designerName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
  }

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !luminaire) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-600 mb-4">{error || "Luminaire non trouvé."}</p>
        <Link href="/luminaires">
          <Button className="mt-4">Retour</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/luminaires">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </Link>

          <div className="flex items-center gap-4">
            {(userData?.role === "admin" || userData?.role === "premium") && (
              <Button
                onClick={generatePDF}
                style={{ backgroundColor: "#f2d895", color: "#000" }}
                className="hover:opacity-90"
                disabled={generatingPDF}
              >
                <Download className="w-4 h-4 mr-2" />
                {generatingPDF ? "Génération..." : "PDF"}
              </Button>
            )}
            <FavoriteToggleButton isActive={isFavorite} onClick={toggleFavorite} />
          </div>
        </div>

        {!canEdit && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p>Mode lecture seule.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Image du luminaire */}
          <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
            {luminaire.image ? (
              <Image
                src={luminaire.image || "/placeholder.svg"}
                alt={String(luminaire.nom || "Luminaire")}
                fill
                className="object-cover"
                onError={(e) => {
                  console.log("❌ Erreur chargement image:", luminaire.image)
                  e.currentTarget.src = "/placeholder.svg"
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl text-gray-400 mb-2">🏮</div>
                  <span className="text-sm text-gray-500">Image non disponible</span>
                </div>
              </div>
            )}
          </div>

          {/* Informations avec scroll - même hauteur que l'image */}
          <div className="aspect-square bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              <div className="space-y-6 font-serif">
                {/* 1. Nom du luminaire */}
                <EditableField
                  value={String(luminaire.nom || "")}
                  onSave={(v) => handleUpdate("nom", v)}
                  className="text-2xl font-serif text-gray-900"
                  placeholder="Nom du luminaire"
                  disabled={!canEdit}
                />

                <div className="space-y-4">
                  {/* 2. Artiste / Dates (avec lien) */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Artiste / Dates</label>
                    {canEdit ? (
                      <EditableField
                        value={String(luminaire.designer || "")}
                        onSave={(v) => handleUpdate("designer", v)}
                        placeholder="Artiste / Dates"
                        disabled={!canEdit}
                      />
                    ) : luminaire.designer ? (
                      <Link
                        href={`/designers/${createDesignerSlug(luminaire.designer)}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {luminaire.designer}
                      </Link>
                    ) : (
                      <span className="text-gray-500">Non renseigné</span>
                    )}
                  </div>

                  {/* 3. Spécialité */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Spécialité</label>
                    <EditableField
                      value={String(luminaire.periode || "")}
                      onSave={(v) => handleUpdate("periode", v)}
                      placeholder="Spécialité"
                      multiline
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 4. Collaboration / Œuvre */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Collaboration / Œuvre</label>
                    <EditableField
                      value={String(luminaire.collaboration || "")}
                      onSave={(v) => handleUpdate("collaboration", v)}
                      placeholder="Collaboration / Œuvre"
                      multiline
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 5. Description */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <EditableField
                      value={String(luminaire.description || "")}
                      onSave={(v) => handleUpdate("description", v)}
                      placeholder="Description"
                      multiline
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 6. Editeur */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Editeur</label>
                    <EditableField
                      value={String(luminaire.editeur || "")}
                      onSave={(v) => handleUpdate("editeur", v)}
                      placeholder="Editeur"
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 7. Année */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Année</label>
                    <EditableField
                      value={String(luminaire.annee || "")}
                      onSave={(v) => handleUpdate("annee", v)}
                      placeholder="Année"
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 8. Signé */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Signé</label>
                    <EditableField
                      value={String(luminaire.signe || "")}
                      onSave={(v) => handleUpdate("signe", v)}
                      placeholder="Signé"
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 9. Dimensions */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Dimensions</label>
                    <EditableField
                      value={String(luminaire.dimensions || "")}
                      onSave={(v) => handleUpdate("dimensions", v)}
                      placeholder="Dimensions"
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 10. Matériaux */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Matériaux</label>
                    <div className="text-sm text-gray-700">
                      {Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0
                        ? luminaire.materiaux.join(", ")
                        : "Non renseigné"}
                    </div>
                  </div>

                  {/* 11. Estimation */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Estimation</label>
                    <EditableField
                      value={String(luminaire.estimation || "")}
                      onSave={(v) => handleUpdate("estimation", v)}
                      placeholder="Estimation"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Luminaires similaires */}
        {Array.isArray(similarLuminaires) && similarLuminaires.length > 0 && (
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-serif text-gray-900 mb-6">Luminaires similaires</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similarLuminaires.map((similar: any) => (
                <Link key={String(similar.id)} href={`/luminaires/${similar.id}`}>
                  <div className="bg-gray-50 rounded-xl overflow-hidden shadow-md group hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative bg-gray-100">
                      {similar.image ? (
                        <Image
                          src={similar.image || "/placeholder.svg"}
                          alt={String(similar.nom || "Luminaire")}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-2xl text-gray-400">🏮</div>
                        </div>
                      )}
                    </div>

                    <div className="p-3 space-y-1">
                      <h3 className="font-serif text-sm truncate">{String(similar.nom || "Sans nom")}</h3>
                      <p className="text-xs text-gray-600 truncate">{String(similar.designer || "")}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
