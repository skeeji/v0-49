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
  annee?: number
  periode: string
  specialite: string
  collaboration: string
  signe: string
  description: string
  dimensions: string
  estimation: string
  editeur: string
  materiaux: string[]
  images: string[]
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
  const [luminaire, setLuminaire] = useState<Luminaire | null>(null)
  const [similar, setSimilar] = useState<Luminaire[]>([])
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
        const res = await fetch(`/api/luminaires?id=${id}`) // Appel à l'API unifiée
        const data = await res.json()
        if (data.success) {
          setLuminaire(data.luminaire)
          setSimilar(data.similar || [])
        } else {
          throw new Error(data.error)
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
    if (!canEdit || !luminaire) return

    setLuminaire((prev) => (prev ? { ...prev, [field]: value } : null))

    try {
      await fetch(`/api/luminaires?id=${luminaire._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
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
      ? favorites.filter((favId: string) => String(favId) !== String(luminaire._id))
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

      addField("Artiste / Dates", luminaire.designer)
      addField("Année", luminaire.annee?.toString() || "")
      addField("Spécialité", luminaire.specialite)
      addField("Collaboration / Œuvre", luminaire.collaboration)
      addField("Description", luminaire.description)
      addField("Editeur", luminaire.editeur)
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-red-500 py-10">Erreur: {error}</div>
  }

  if (!luminaire) {
    return <div className="text-center py-10">Luminaire non trouvé.</div>
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
                {/* AFFICHAGE DANS L'ORDRE DEMANDÉ */}
                <EditableField
                  value={String(luminaire.nom || "")}
                  onSave={(v) => handleUpdate("nom", v)}
                  className="text-2xl font-serif text-gray-900"
                  placeholder="Nom du luminaire"
                  disabled={!canEdit}
                />

                <div className="space-y-4">
                  <div>
                    <span className="font-semibold">Artiste / Dates : </span>
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
                        className="text-blue-600 hover:underline"
                      >
                        {luminaire.designer}
                      </Link>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </div>

                  <p>
                    <span className="font-semibold">Spécialité : </span>
                    {canEdit ? (
                      <EditableField
                        value={String(luminaire.specialite || "")}
                        onSave={(v) => handleUpdate("specialite", v)}
                        placeholder="Spécialité"
                        disabled={!canEdit}
                      />
                    ) : (
                      luminaire.specialite || "N/A"
                    )}
                  </p>

                  <p>
                    <span className="font-semibold">Collaboration / Œuvre : </span>
                    {canEdit ? (
                      <EditableField
                        value={String(luminaire.collaboration || "")}
                        onSave={(v) => handleUpdate("collaboration", v)}
                        placeholder="Collaboration / Œuvre"
                        disabled={!canEdit}
                      />
                    ) : (
                      luminaire.collaboration || "N/A"
                    )}
                  </p>

                  <p>
                    <span className="font-semibold">Description : </span>
                    {canEdit ? (
                      <EditableField
                        value={String(luminaire.description || "")}
                        onSave={(v) => handleUpdate("description", v)}
                        placeholder="Description"
                        disabled={!canEdit}
                      />
                    ) : (
                      luminaire.description || "N/A"
                    )}
                  </p>

                  <p>
                    <span className="font-semibold">Editeur : </span>
                    {canEdit ? (
                      <EditableField
                        value={String(luminaire.editeur || "")}
                        onSave={(v) => handleUpdate("editeur", v)}
                        placeholder="Editeur"
                        disabled={!canEdit}
                      />
                    ) : (
                      luminaire.editeur || "N/A"
                    )}
                  </p>

                  <p>
                    <span className="font-semibold">Année : </span>
                    {canEdit ? (
                      <EditableField
                        value={String(luminaire.annee || "")}
                        onSave={(v) => handleUpdate("annee", v)}
                        placeholder="Année"
                        disabled={!canEdit}
                      />
                    ) : (
                      luminaire.annee || "N/A"
                    )}
                  </p>

                  <p>
                    <span className="font-semibold">Signé : </span>
                    {canEdit ? (
                      <EditableField
                        value={String(luminaire.signe || "")}
                        onSave={(v) => handleUpdate("signe", v)}
                        placeholder="Signé"
                        disabled={!canEdit}
                      />
                    ) : (
                      luminaire.signe || "N/A"
                    )}
                  </p>

                  <p>
                    <span className="font-semibold">Dimensions : </span>
                    {canEdit ? (
                      <EditableField
                        value={String(luminaire.dimensions || "")}
                        onSave={(v) => handleUpdate("dimensions", v)}
                        placeholder="Dimensions"
                        disabled={!canEdit}
                      />
                    ) : (
                      luminaire.dimensions || "N/A"
                    )}
                  </p>

                  <p>
                    <span className="font-semibold">Matériaux : </span>
                    {luminaire.materiaux.join(", ") || "N/A"}
                  </p>

                  <p>
                    <span className="font-semibold">Estimation : </span>
                    {canEdit ? (
                      <EditableField
                        value={String(luminaire.estimation || "")}
                        onSave={(v) => handleUpdate("estimation", v)}
                        placeholder="Estimation"
                        disabled={!canEdit}
                      />
                    ) : (
                      luminaire.estimation || "N/A"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t pt-8">
          <h2 className="text-2xl font-serif text-center mb-8">Luminaires Similaires</h2>
          {similar.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similar.map((item) => (
                <Link key={item._id} href={`/luminaires/${item._id}`} className="block group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {item.image && (
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.nom}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <h3 className="mt-2 font-semibold text-sm truncate">{item.nom}</h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
