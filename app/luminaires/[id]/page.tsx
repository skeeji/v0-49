"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { useAuth } from "@/contexts/AuthContext"
import jsPDF from "jspdf"

interface Luminaire {
  _id: string
  id: string
  nom: string
  designer: string
  specialite?: string
  collaboration?: string
  description: string
  editeur?: string
  annee?: number
  signe?: string
  dimensions: string
  materiaux: string[]
  estimation: string
  image?: string
}

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")

export default function LuminaireDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState<{ luminaire: Luminaire | null; similar: Luminaire[] }>({
    luminaire: null,
    similar: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const { userData, loading: authLoading } = useAuth()

  const canEdit = !authLoading && userData?.role === "admin"

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/luminaires?id=${id}`)
        const result = await res.json()
        if (result.success) {
          setData({ luminaire: result.luminaire, similar: result.similar || [] })
        } else {
          throw new Error(result.error)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    // Charger les favoris
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
    setIsFavorite(favorites.includes(String(id)))
  }, [id])

  const handleUpdate = async (field: string, value: string) => {
    if (!canEdit || !data.luminaire) return

    const keyMapping: { [key: string]: string } = {
      nom: "nom",
      designer: "designer",
      specialite: "specialite",
      collaboration: "collaboration",
      description: "description",
      editeur: "editeur",
      annee: "annee",
      signe: "signe",
      dimensions: "dimensions",
      estimation: "estimation",
    }

    const keyToUpdate = keyMapping[field] || field

    setData((prev) => ({
      ...prev,
      luminaire: prev.luminaire ? { ...prev.luminaire, [field]: value } : null,
    }))

    try {
      await fetch(`/api/luminaires/${data.luminaire._id}`, {
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
    if (!data.luminaire) return

    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
    const newFavorites = isFavorite
      ? favorites.filter((favId: string) => String(favId) !== String(data.luminaire!._id))
      : [...favorites, String(data.luminaire._id)]

    localStorage.setItem("favorites", JSON.stringify(newFavorites))
    setIsFavorite(!isFavorite)
  }

  const generatePDF = async () => {
    if (!data.luminaire) return

    setGeneratingPDF(true)
    try {
      const pdf = new jsPDF()

      // Titre
      pdf.setFontSize(20)
      pdf.text(String(data.luminaire.nom || "Luminaire sans nom"), 20, 30)

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

      addField("Artiste / Dates", data.luminaire.designer)
      addField("Année", data.luminaire.annee?.toString() || "")
      addField("Spécialité", data.luminaire.specialite || "")
      addField("Collaboration / Œuvre", data.luminaire.collaboration || "")
      addField("Signé", data.luminaire.signe || "")
      addField("Description", data.luminaire.description || "")
      addField("Editeur", data.luminaire.editeur || "")
      addField("Dimensions", data.luminaire.dimensions || "")
      addField("Matériaux", data.luminaire.materiaux.join(", "))
      addField("Estimation", data.luminaire.estimation || "")

      // Sauvegarder le PDF
      pdf.save(`${String(data.luminaire.nom || "luminaire")}.pdf`)
    } catch (error) {
      console.error("❌ Erreur génération PDF:", error)
    } finally {
      setGeneratingPDF(false)
    }
  }

  const { luminaire, similar } = data

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center py-16">
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Erreur: {error}</div>
  }

  if (!luminaire) {
    return <div className="text-center py-10">Aucun luminaire trouvé.</div>
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
                        href={`/designers/${slugify(luminaire.designer)}`}
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
                      value={String(luminaire.specialite || "")}
                      onSave={(v) => handleUpdate("specialite", v)}
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
                      {luminaire.materiaux.length > 0 ? luminaire.materiaux.join(", ") : "Non renseigné"}
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
        <div className="mt-16 border-t pt-8">
          <h2 className="text-2xl font-serif text-center mb-8">Luminaires Similaires</h2>
          {similar.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((item) => (
                <Link key={item._id} href={`/luminaires/${item._id}`} className="block group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {item.image ? (
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.nom}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-2xl text-gray-400">🏮</div>
                      </div>
                    )}
                  </div>
                  <h3 className="mt-2 font-semibold text-sm truncate">{item.nom}</h3>
                  <p className="text-xs text-gray-600 truncate">{item.designer}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">Aucun luminaire similaire trouvé.</p>
          )}
        </div>
      </div>
    </div>
  )
}
