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
          setLuminaire(result.data)
          console.log("✅ Luminaire chargé:", result.data)

          // Charger TOUS les luminaires pour trouver les 6 plus proches
          const allLuminairesResponse = await fetch("/api/luminaires?limit=9999")
          const allLuminairesData = await allLuminairesResponse.json()

          if (allLuminairesData.success) {
            const similar = findSimilarLuminaires(result.data, allLuminairesData.luminaires)
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
      setIsFavorite(favorites.includes(String(params.id)))
    }

    fetchLuminaireData()
  }, [params.id])

  const findSimilarLuminaires = (current: any, all: any[]) => {
    const currentYear = Number.parseInt(current.annee) || 0

    // Filtrer et scorer tous les luminaires
    const scored = all
      .filter((item) => String(item._id) !== String(current.id))
      .map((item) => {
        let score = 0

        const itemArtist = String(item["Artiste / Dates"] || item.designer || "")
        const itemSpecialty = String(item["Spécialité"] || item.periode || "")
        const itemYear = Number.parseInt(String(item.annee || item["Année"] || "")) || 0

        // Score par artiste (poids le plus élevé)
        if (itemArtist && current.designer && itemArtist === current.designer) score += 5

        // Score par spécialité
        if (itemSpecialty && current.specialty && itemSpecialty === current.specialty) score += 3

        // Score par proximité d'année
        if (currentYear > 0 && itemYear > 0) {
          const yearDiff = Math.abs(currentYear - itemYear)
          if (yearDiff <= 5) score += 3
          else if (yearDiff <= 10) score += 2
          else if (yearDiff <= 20) score += 1
        }

        return {
          ...item,
          id: String(item._id || ""),
          image: item.filename ? `/api/images/filename/${item.filename}` : null,
          artist: itemArtist,
          year: String(item.annee || item["Année"] || ""),
          name: String(item["Nom luminaire"] || item.nom || "Sans nom"),
          similarityScore: score,
        }
      })

    // Trier par score décroissant et prendre les 6 premiers
    const topSimilar = scored
      .filter((item) => item.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 6)

    // Si moins de 6, compléter avec des luminaires aléatoires
    if (topSimilar.length < 6) {
      const remaining = scored
        .filter((item) => item.similarityScore === 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 6 - topSimilar.length)

      return [...topSimilar, ...remaining]
    }

    return topSimilar
  }

  const handleUpdate = async (field: string, value: string) => {
    if (!canEdit || !luminaire) return

    const keyMapping: { [key: string]: string } = {
      designer: "Artiste / Dates",
      editeur: "Editeur",
      annee: "Année",
      dimensions: "Dimensions",
      estimation: "Estimation",
      collaboration: "Collaboration / Œuvre",
      description: "Description",
      nom: "Nom luminaire",
    }

    const keyToUpdate = keyMapping[field] || field

    setLuminaire((prev: any) => ({ ...prev, [field]: String(value) }))

    try {
      await fetch(`/api/luminaires/${luminaire.id}`, {
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
      ? favorites.filter((id: string) => String(id) !== String(luminaire.id))
      : [...favorites, String(luminaire.id)]

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
      addField("Editeur", luminaire.editeur)
      addField("Année", luminaire.annee)
      addField("Dimensions", luminaire.dimensions)
      addField("Estimation", luminaire.estimation)
      addField("Collaboration / Œuvre", luminaire.collaboration)
      addField("Description", luminaire.description)
      addField("Matériaux", Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join(", ") : "")

      // Ajouter l'image si disponible
      if (luminaire.image) {
        try {
          const tempImg = document.createElement("img")
          tempImg.crossOrigin = "anonymous"

          await new Promise<void>((resolve) => {
            tempImg.onload = () => {
              try {
                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")

                if (ctx) {
                  canvas.width = 100
                  canvas.height = 100
                  ctx.drawImage(tempImg, 0, 0, 100, 100)
                  const dataURL = canvas.toDataURL("image/jpeg", 0.7)
                  pdf.addImage(dataURL, "JPEG", 20, yPos + 10, 100, 100)
                }
              } catch (error) {
                console.error("❌ Erreur traitement image PDF:", error)
              }
              resolve()
            }

            tempImg.onerror = () => {
              console.error("❌ Erreur chargement image PDF")
              resolve()
            }

            tempImg.src = luminaire.image
          })
        } catch (error) {
          console.error("❌ Erreur ajout image PDF:", error)
        }
      }

      pdf.save(`${String(luminaire.nom || "luminaire")}.pdf`)
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
          {/* Colonne Image Luminaire (UNIQUEMENT) */}
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

          {/* Colonne Informations */}
          <div className="aspect-square bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              <div className="space-y-6 font-serif">
                <EditableField
                  value={String(luminaire.nom || "")}
                  onSave={(v) => handleUpdate("nom", v)}
                  className="text-2xl font-serif text-gray-900"
                  placeholder="Nom du luminaire"
                  disabled={!canEdit}
                />

                <div className="space-y-4">
                  {/* CORRECTION: Chaque champ affiche sa propre valeur, sans fallback */}
                  <InfoRow
                    label="Artiste / Dates"
                    value={luminaire.designer}
                    fieldName="designer"
                    onSave={handleUpdate}
                    canEdit={canEdit}
                  />
                  <InfoRow
                    label="Editeur"
                    value={luminaire.editeur}
                    fieldName="editeur"
                    onSave={handleUpdate}
                    canEdit={canEdit}
                  />
                  <InfoRow
                    label="Année"
                    value={luminaire.annee}
                    fieldName="annee"
                    onSave={handleUpdate}
                    canEdit={canEdit}
                  />
                  <InfoRow
                    label="Dimensions"
                    value={luminaire.dimensions}
                    fieldName="dimensions"
                    onSave={handleUpdate}
                    canEdit={canEdit}
                  />
                  <InfoRow
                    label="Estimation"
                    value={luminaire.estimation}
                    fieldName="estimation"
                    onSave={handleUpdate}
                    canEdit={canEdit}
                  />
                  <InfoRow
                    label="Collaboration / Œuvre"
                    value={luminaire.collaboration}
                    fieldName="collaboration"
                    onSave={handleUpdate}
                    canEdit={canEdit}
                    multiline
                  />
                  <InfoRow
                    label="Description"
                    value={luminaire.description}
                    fieldName="description"
                    onSave={handleUpdate}
                    canEdit={canEdit}
                    multiline
                  />

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Matériaux</label>
                    <p className="text-gray-800 pt-1">
                      {Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join(", ") : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Images similaires */}
        {similarLuminaires.length > 0 && (
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-serif text-gray-900 mb-6">Luminaires similaires</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {similarLuminaires.map((similar: any) => (
                <Link key={String(similar.id)} href={`/luminaires/${similar.id}`}>
                  <div className="bg-gray-50 rounded-xl overflow-hidden shadow-md group hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative bg-gray-100">
                      {similar.image ? (
                        <Image
                          src={similar.image || "/placeholder.svg"}
                          alt={String(similar.name || "Luminaire")}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-2xl text-gray-400">🏮</div>
                        </div>
                      )}
                    </div>

                    <div className="p-2 space-y-1">
                      <h3 className="font-serif text-xs truncate">{String(similar.name || "Sans nom")}</h3>
                      <p className="text-xs text-gray-600 truncate">{String(similar.artist || "")}</p>
                      <p className="text-xs text-gray-500">{String(similar.year || "")}</p>
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

// Helper component
const InfoRow = ({ label, value, fieldName, onSave, canEdit, multiline = false }: any) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
    <EditableField
      value={value || ""}
      onSave={(v: string) => onSave(fieldName, v)}
      placeholder="Non spécifié"
      disabled={!canEdit}
      multiline={multiline}
    />
  </div>
)
