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
          // Debug des clés disponibles
          console.log("🔍 Clés disponibles dans le luminaire:", Object.keys(result.data))
          console.log("🔍 Valeurs matériaux et signé:", {
            materiaux: result.data.materiaux,
            Matériaux: result.data.Matériaux,
            materials: result.data.materials,
            signe: result.data.signe,
            signed: result.data.signed,
            Signé: result.data.Signé,
          })

          // Formater le luminaire avec compatibilité CSV et formulaire
          const formattedLuminaire = {
            ...result.data,
            id: String(result.data._id || ""),
            _id: String(result.data._id || ""),
            image: result.data.image || (result.data.filename ? `/api/images/filename/${result.data.filename}` : null),

            // Champs principaux avec compatibilité CSV/formulaire
            artist: String(result.data.designer || result.data["Artiste / Dates"] || ""),
            specialty: String(result.data.periode || result.data["Spécialité"] || result.data.specialite || ""),
            year: String(result.data.annee || result.data["Année"] || ""),
            name: String(result.data.nom || result.data["Nom luminaire"] || ""),

            // Champs avec compatibilité CSV/formulaire
            description: String(result.data.description || result.data["Description"] || ""),
            collaboration: String(
              result.data.collaboration || result.data["Collaboration / Œuvre"] || result.data.oeuvre || "",
            ),
            dimensions: String(result.data.dimensions || result.data["Dimensions"] || ""),
            estimation: String(result.data.estimation || result.data["Estimation"] || ""),
            editeur: String(result.data.editeur || result.data["Editeur"] || ""),

            // Gestion des matériaux - RECHERCHE EXHAUSTIVE
            materials: (() => {
              const materiauxKeys = [
                "materiaux",
                "Matériaux",
                "materials",
                "Materials",
                "matériaux",
                "MATERIAUX",
                "MATERIALS",
              ]

              for (const key of materiauxKeys) {
                if (result.data[key]) {
                  if (Array.isArray(result.data[key]) && result.data[key].length > 0) {
                    return result.data[key].join(", ")
                  } else if (typeof result.data[key] === "string" && result.data[key].trim() !== "") {
                    return result.data[key].trim()
                  }
                }
              }
              return ""
            })(),

            // Gestion de Signé - RECHERCHE EXHAUSTIVE
            signed: (() => {
              const signeKeys = ["signe", "signed", "Signé", "SIGNE", "SIGNED"]

              for (const key of signeKeys) {
                if (result.data[key] && typeof result.data[key] === "string" && result.data[key].trim() !== "") {
                  return result.data[key].trim()
                }
              }
              return ""
            })(),
          }

          console.log("✅ Luminaire formaté:", {
            materials: formattedLuminaire.materials,
            signed: formattedLuminaire.signed,
            specialty: formattedLuminaire.specialty,
            collaboration: formattedLuminaire.collaboration,
          })

          setLuminaire(formattedLuminaire)

          // Charger TOUS les luminaires pour trouver les 6 plus proches
          const allLuminairesResponse = await fetch("/api/luminaires?limit=9999")
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
      setIsFavorite(favorites.includes(String(params.id)))
    }

    fetchLuminaireData()
  }, [params.id])

  const findSimilarLuminaires = (current: any, all: any[]) => {
    const currentYear = Number.parseInt(current.year) || 0

    // Filtrer et scorer tous les luminaires
    const scored = all
      .filter((item) => String(item._id) !== String(current._id))
      .map((item) => {
        let score = 0

        const itemArtist = String(item["Artiste / Dates"] || item.designer || "")
        const itemSpecialty = String(item["Spécialité"] || item.periode || item.specialite || "")
        const itemYear = Number.parseInt(String(item.annee || item["Année"] || "")) || 0

        // Score par artiste (poids le plus élevé - priorité 1)
        if (itemArtist && current.artist && itemArtist === current.artist) score += 10

        // Score par spécialité/style (priorité 1)
        if (itemSpecialty && current.specialty && itemSpecialty === current.specialty) score += 8

        // Score par proximité d'année (priorité 2)
        if (currentYear > 0 && itemYear > 0) {
          const yearDiff = Math.abs(currentYear - itemYear)
          if (yearDiff <= 2) score += 6
          else if (yearDiff <= 5) score += 4
          else if (yearDiff <= 10) score += 2
          else if (yearDiff <= 20) score += 1
        }

        // Score par nom similaire (bonus)
        if (current.name && item["Nom luminaire"]) {
          const currentWords = current.name.toLowerCase().split(/\s+/)
          const itemWords = String(item["Nom luminaire"]).toLowerCase().split(/\s+/)
          const commonWords = currentWords.filter(
            (word) =>
              word.length > 3 && itemWords.some((itemWord) => itemWord.includes(word) || word.includes(itemWord)),
          )
          score += commonWords.length * 0.5
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
    const topSimilar = scored.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 6)

    // Si moins de 6 avec score > 0, compléter avec des luminaires aléatoires
    if (topSimilar.length < 6) {
      const remaining = scored
        .filter((item) => !topSimilar.includes(item))
        .sort(() => Math.random() - 0.5)
        .slice(0, 6 - topSimilar.length)

      return [...topSimilar, ...remaining]
    }

    return topSimilar
  }

  const handleUpdate = async (field: string, value: string) => {
    if (!canEdit || !luminaire) return

    const keyMapping: { [key: string]: string } = {
      artist: "designer",
      specialty: "periode",
      collaboration: "collaboration",
      description: "description",
      name: "nom",
      year: "annee",
      signed: "signe",
      dimensions: "dimensions",
      materials: "materiaux",
      estimation: "estimation",
      editeur: "editeur",
    }

    const keyToUpdate = keyMapping[field] || field

    setLuminaire((prev: any) => ({ ...prev, [field]: String(value) }))

    try {
      await fetch(`/api/luminaires/${luminaire._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [keyToUpdate]: value }),
      })
      console.log(`✅ Luminaire mis à jour - ${field} (${keyToUpdate}):`, value)
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
      pdf.text(String(luminaire.name || "Luminaire sans nom"), 20, 30)

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

      addField("Artiste / Dates", luminaire.artist)
      addField("Editeur", luminaire.editeur)
      addField("Année", luminaire.year)
      addField("Spécialité", luminaire.specialty)
      addField("Collaboration / Œuvre", luminaire.collaboration)
      addField("Description", luminaire.description)
      addField("Signé", luminaire.signed)
      addField("Dimensions", luminaire.dimensions)
      addField("Matériaux", luminaire.materials)
      addField("Estimation", luminaire.estimation)

      // Ajouter l'image si disponible - Version simplifiée
      if (luminaire.image) {
        try {
          // Créer un élément image temporaire
          const tempImg = document.createElement("img")
          tempImg.crossOrigin = "anonymous"

          // Promesse pour charger l'image
          await new Promise<void>((resolve) => {
            tempImg.onload = () => {
              try {
                // Créer un canvas
                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")

                if (ctx) {
                  // Définir la taille du canvas
                  canvas.width = 100
                  canvas.height = 100

                  // Dessiner l'image
                  ctx.drawImage(tempImg, 0, 0, 100, 100)

                  // Convertir en base64
                  const dataURL = canvas.toDataURL("image/jpeg", 0.7)

                  // Ajouter au PDF
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

            // Charger l'image
            tempImg.src = luminaire.image
          })
        } catch (error) {
          console.error("❌ Erreur ajout image PDF:", error)
        }
      }

      // Sauvegarder le PDF
      pdf.save(`${String(luminaire.name || "luminaire")}.pdf`)
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
          {/* Image du luminaire UNIQUEMENT */}
          <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
            {luminaire.image ? (
              <Image
                src={luminaire.image || "/placeholder.svg"}
                alt={String(luminaire.name || "Luminaire")}
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
                {/* Nom du luminaire (titre) */}
                <EditableField
                  value={String(luminaire.name || "")}
                  onSave={(v) => handleUpdate("name", v)}
                  className="text-2xl font-serif text-gray-900"
                  placeholder="Nom du luminaire"
                  disabled={!canEdit}
                />

                <div className="space-y-4">
                  {/* 1. Artiste / Dates - Lien sans style */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Artiste / Dates</label>
                    {luminaire.artist ? (
                      <Link
                        href={`/designers/${encodeURIComponent(luminaire.artist)}`}
                        className="text-gray-900 no-underline hover:no-underline"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <EditableField
                          value={String(luminaire.artist || "")}
                          onSave={(v) => handleUpdate("artist", v)}
                          placeholder="Artiste / Dates"
                          disabled={!canEdit}
                        />
                      </Link>
                    ) : (
                      <EditableField
                        value={String(luminaire.artist || "")}
                        onSave={(v) => handleUpdate("artist", v)}
                        placeholder="Artiste / Dates"
                        disabled={!canEdit}
                      />
                    )}
                  </div>

                  {/* 2. Spécialité */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Spécialité</label>
                    <EditableField
                      value={String(luminaire.specialty || "")}
                      onSave={(v) => handleUpdate("specialty", v)}
                      placeholder="Spécialité"
                      multiline
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 3. Collaboration / Œuvre */}
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

                  {/* 4. Editeur */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Editeur</label>
                    <EditableField
                      value={String(luminaire.editeur || "")}
                      onSave={(v) => handleUpdate("editeur", v)}
                      placeholder="Editeur"
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

                  {/* 6. Année */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Année</label>
                    <EditableField
                      value={String(luminaire.year || "")}
                      onSave={(v) => handleUpdate("year", v)}
                      placeholder="Année"
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 7. Dimensions */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Dimensions</label>
                    <EditableField
                      value={String(luminaire.dimensions || "")}
                      onSave={(v) => handleUpdate("dimensions", v)}
                      placeholder="Dimensions"
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 8. Matériaux */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Matériaux</label>
                    <EditableField
                      value={String(luminaire.materials || "")}
                      onSave={(v) => handleUpdate("materials", v)}
                      placeholder="Matériaux"
                      multiline
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 9. Signé */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Signé</label>
                    <EditableField
                      value={String(luminaire.signed || "")}
                      onSave={(v) => handleUpdate("signed", v)}
                      placeholder="Signé"
                      disabled={!canEdit}
                    />
                  </div>

                  {/* 10. Estimation */}
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
