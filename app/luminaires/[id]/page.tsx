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
  const { userData, loading: authLoading } = useAuth()

  const canEdit = !authLoading && userData?.role === "admin"

  useEffect(() => {
    if (!params.id) return

    async function fetchLuminaireData() {
      setIsLoading(true)
      try {
        console.log("🔍 Chargement luminaire ID:", params.id)

        const response = await fetch(`/api/luminaires/${params.id}`)
        if (!response.ok) throw new Error("Luminaire non trouvé")

        const result = await response.json()
        console.log("📊 Réponse API luminaire:", result)

        if (result.success) {
          const formattedLuminaire = {
            ...result.data,
            id: result.data._id,
            // CORRECTION: Utiliser le nom du fichier pour l'image
            image: result.data.filename ? `/api/images/filename/${result.data.filename}` : null,
            artist: result.data["Artiste / Dates"] || result.data.designer || "",
            specialty: result.data["Spécialité"] || result.data.periode || "",
            collaboration: result.data["Collaboration / Œuvre"] || result.data.description || "",
            year: result.data.annee || result.data["Année"] || "",
            signed: result.data["Signé"] || result.data.signe || "",
            name: result.data["Nom luminaire"] || result.data.nom || "",
            filename: result.data["Nom du fichier"] || result.data.filename || "",
            dimensions: result.data["Dimensions"] || result.data.dimensions || "",
            materials: result.data["Matériaux"] || result.data.materiaux || "",
            estimation: result.data["Estimation"] || result.data.estimation || "",
            provenance: result.data["Provenance"] || result.data.provenance || "",
            condition: result.data["État"] || result.data.condition || "",
            notes: result.data["Notes"] || result.data.notes || "",
          }

          setLuminaire(formattedLuminaire)
          console.log("✅ Luminaire formaté:", formattedLuminaire)

          // Charger les luminaires similaires
          const allLuminairesResponse = await fetch("/api/luminaires?limit=100")
          const allLuminairesData = await allLuminairesResponse.json()

          if (allLuminairesData.success) {
            const similar = findSimilarLuminaires(formattedLuminaire, allLuminairesData.luminaires)
            setSimilarLuminaires(similar)
            console.log("✅ Luminaires similaires:", similar.length)
          }
        }
      } catch (error) {
        console.error("❌ Erreur chargement:", error)
        setLuminaire(null)
      } finally {
        setIsLoading(false)
      }

      // Charger les favoris
      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
      setIsFavorite(favorites.includes(params.id as string))
    }

    fetchLuminaireData()
  }, [params.id])

  const findSimilarLuminaires = (current: any, all: any[]) => {
    const currentYear = Number.parseInt(current.year) || 0

    return all
      .filter((item) => item._id !== current._id)
      .map((item) => {
        let score = 0

        const itemArtist = item["Artiste / Dates"] || item.designer || ""
        if (itemArtist && current.artist && itemArtist === current.artist) score += 3

        const itemSpecialty = item["Spécialité"] || item.periode || ""
        if (itemSpecialty && current.specialty && itemSpecialty === current.specialty) score += 2

        const itemYear = Number.parseInt(item.annee || item["Année"]) || 0
        if (currentYear > 0 && itemYear > 0 && Math.abs(currentYear - itemYear) <= 10) score += 1

        return {
          ...item,
          id: item._id,
          image: item.filename ? `/api/images/filename/${item.filename}` : null,
          artist: itemArtist,
          year: item.annee || item["Année"] || "",
          name: item["Nom luminaire"] || item.nom || "Sans nom",
          similarityScore: score,
        }
      })
      .filter((item) => item.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 6)
  }

  const handleUpdate = async (field: string, value: string) => {
    if (!canEdit || !luminaire) return

    const keyMapping: { [key: string]: string } = {
      artist: "Artiste / Dates",
      specialty: "Spécialité",
      collaboration: "Collaboration / Œuvre",
      name: "Nom luminaire",
      year: "Année",
      signed: "Signé",
      dimensions: "Dimensions",
      materials: "Matériaux",
      estimation: "Estimation",
      provenance: "Provenance",
      condition: "État",
      notes: "Notes",
    }

    const keyToUpdate = keyMapping[field] || field

    setLuminaire((prev: any) => ({ ...prev, [field]: value }))

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
      ? favorites.filter((id: string) => id !== luminaire._id)
      : [...favorites, luminaire._id]

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
      pdf.text(luminaire.name || "Luminaire sans nom", 20, 30)

      // Informations
      pdf.setFontSize(12)
      let yPos = 50

      const addField = (label: string, value: string) => {
        if (value) {
          pdf.text(`${label}: ${value}`, 20, yPos)
          yPos += 10
        }
      }

      addField("Artiste / Dates", luminaire.artist)
      addField("Année", luminaire.year)
      addField("Spécialité", luminaire.specialty)
      addField("Collaboration / Œuvre", luminaire.collaboration)
      addField("Signé", luminaire.signed)
      addField("Dimensions", luminaire.dimensions)
      addField("Matériaux", luminaire.materials)
      addField("Estimation", luminaire.estimation)
      addField("Provenance", luminaire.provenance)
      addField("État", luminaire.condition)
      addField("Notes", luminaire.notes)

      // Ajouter l'image si disponible
      if (luminaire.image) {
        try {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            canvas.width = img.width
            canvas.height = img.height
            ctx?.drawImage(img, 0, 0)

            const imgData = canvas.toDataURL("image/jpeg", 0.8)
            pdf.addImage(imgData, "JPEG", 20, yPos + 10, 100, 100)
            pdf.save(`${luminaire.name || "luminaire"}.pdf`)
          }
          img.src = luminaire.image
        } catch (error) {
          console.error("❌ Erreur ajout image PDF:", error)
          pdf.save(`${luminaire.name || "luminaire"}.pdf`)
        }
      } else {
        pdf.save(`${luminaire.name || "luminaire"}.pdf`)
      }
    } catch (error) {
      console.error("❌ Erreur génération PDF:", error)
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (isLoading || authLoading) {
    return (
      <div className="text-center py-16">
        <p>Chargement...</p>
      </div>
    )
  }

  if (!luminaire) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Luminaire non trouvé.</p>
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
          <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
            {luminaire.image ? (
              <Image
                src={luminaire.image || "/placeholder.svg"}
                alt={luminaire.name || "Luminaire"}
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

          <div className="space-y-6">
            <div className="space-y-4 font-serif">
              <EditableField
                value={luminaire.name || ""}
                onSave={(v) => handleUpdate("name", v)}
                className="text-2xl font-serif text-gray-900"
                placeholder="Nom du luminaire"
                disabled={!canEdit}
              />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Artiste / Dates</label>
                  <EditableField
                    value={luminaire.artist || ""}
                    onSave={(v) => handleUpdate("artist", v)}
                    placeholder="Artiste / Dates"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Spécialité</label>
                  <EditableField
                    value={luminaire.specialty || ""}
                    onSave={(v) => handleUpdate("specialty", v)}
                    placeholder="Spécialité"
                    multiline
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Collaboration / Œuvre</label>
                  <EditableField
                    value={luminaire.collaboration || ""}
                    onSave={(v) => handleUpdate("collaboration", v)}
                    placeholder="Collaboration / Œuvre"
                    multiline
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Année</label>
                  <EditableField
                    value={luminaire.year || ""}
                    onSave={(v) => handleUpdate("year", v)}
                    placeholder="Année"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Signé</label>
                  <EditableField
                    value={luminaire.signed || ""}
                    onSave={(v) => handleUpdate("signed", v)}
                    placeholder="Signé"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Dimensions</label>
                  <EditableField
                    value={luminaire.dimensions || ""}
                    onSave={(v) => handleUpdate("dimensions", v)}
                    placeholder="Dimensions"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Matériaux</label>
                  <EditableField
                    value={luminaire.materials || ""}
                    onSave={(v) => handleUpdate("materials", v)}
                    placeholder="Matériaux"
                    multiline
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Estimation</label>
                  <EditableField
                    value={luminaire.estimation || ""}
                    onSave={(v) => handleUpdate("estimation", v)}
                    placeholder="Estimation"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Provenance</label>
                  <EditableField
                    value={luminaire.provenance || ""}
                    onSave={(v) => handleUpdate("provenance", v)}
                    placeholder="Provenance"
                    multiline
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">État</label>
                  <EditableField
                    value={luminaire.condition || ""}
                    onSave={(v) => handleUpdate("condition", v)}
                    placeholder="État"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                  <EditableField
                    value={luminaire.notes || ""}
                    onSave={(v) => handleUpdate("notes", v)}
                    placeholder="Notes"
                    multiline
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {similarLuminaires.length > 0 && (
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-serif text-gray-900 mb-6">Luminaires similaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarLuminaires.map((similar: any) => (
                <Link key={similar.id} href={`/luminaires/${similar.id}`}>
                  <div className="bg-gray-50 rounded-xl overflow-hidden shadow-md group hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative bg-gray-100">
                      {similar.image ? (
                        <Image
                          src={similar.image || "/placeholder.svg"}
                          alt={similar.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-4xl text-gray-400">🏮</div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-serif text-lg truncate">{similar.name || "Sans nom"}</h3>
                      <p className="text-sm text-gray-600">{similar.artist}</p>
                      <p className="text-xs text-gray-500">{similar.year}</p>
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
