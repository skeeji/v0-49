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
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"

export default function LuminaireDetailPage() {
  const params = useParams()
  const [luminaire, setLuminaire] = useState<any>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [similarLuminaires, setSimilarLuminaires] = useState<any[]>([])
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { user, userData, loading: authLoading } = useAuth()

  const canEdit = !authLoading && userData?.role === "admin"
  const canSeeEstimation = user && (userData?.role === "admin" || userData?.role === "premium")

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
            id: String(result.data._id || ""),
            _id: String(result.data._id || ""),

            artist: result.data.designer || result.data["Artiste / Dates"] || "",
            year: result.data.annee || result.data["Année"] || "",
            name: result.data.nom || result.data["Nom luminaire"] || "",
            description: result.data.description || result.data["Description"] || "",
            dimensions: result.data.dimensions || result.data["Dimensions"] || "",
            estimation: result.data.estimation || result.data["Estimation"] || "",
            editeur: result.data.editeur || result.data["Editeur"] || "",
            categorie: result.data.categorie || result.data["Catégorie"] || "",

            specialty: (() => {
              if (result.data.periode && String(result.data.periode).trim() !== "") {
                return result.data.periode
              }
              if (result.data["Spécialité"] && String(result.data["Spécialité"]).trim() !== "") {
                return result.data["Spécialité"]
              }
              return ""
            })(),

            collaboration: (() => {
              if (result.data.collaboration && String(result.data.collaboration).trim() !== "") {
                return result.data.collaboration
              }
              if (result.data["Collaboration / Œuvre"] && String(result.data["Collaboration / Œuvre"]).trim() !== "") {
                return result.data["Collaboration / Œuvre"]
              }
              return ""
            })(),

            materials: (() => {
              if (Array.isArray(result.data.materiaux) && result.data.materiaux.length > 0) {
                return result.data.materiaux.join(", ")
              }
              if (result.data.Matériaux && String(result.data.Matériaux).trim() !== "") {
                return result.data.Matériaux
              }
              return ""
            })(),

            signed: (() => {
              const signeKeys = ["signe", "signed", "Signé", "SIGNE", "SIGNED"]
              for (const key of signeKeys) {
                if (result.data[key] && typeof result.data[key] === "string" && result.data[key].trim() !== "") {
                  return result.data[key]
                }
              }
              return ""
            })(),

            lienSiteMarchand: result.data.lienSiteMarchand || result.data["Lien site marchand"] || "",
            etiquette: result.data.etiquette || result.data["Etiquette"] || "",
            bibliographie: result.data.bibliographie || result.data["Bibliographie"] || "",
          }

          console.log("✅ Luminaire formaté:", formattedLuminaire)

          setLuminaire(formattedLuminaire)

          const allLuminairesResponse = await fetch("/api/luminaires?limit=9999")
          const allLuminairesData = await allLuminairesResponse.json()

          if (allLuminairesData.success) {
            const similar = findSimilarLuminaires(formattedLuminaire, allLuminairesData.luminaires)
            setSimilarLuminaires(similar)
          }
        }
      } catch (error) {
        console.error("❌ Erreur chargement:", error)
        setLuminaire(null)
      } finally {
        setIsLoading(false)
      }

      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
      setIsFavorite(favorites.includes(String(params.id)))
    }

    fetchLuminaireData()
  }, [params.id])

  const findSimilarLuminaires = (current: any, all: any[]) => {
    const currentYear = Number.parseInt(current.year) || 0

    const scored = all
      .filter((item) => String(item._id) !== String(current._id))
      .map((item) => {
        let score = 0

        const itemArtist = String(item["Artiste / Dates"] || item.designer || "")
        const itemSpecialty = String(item["Spécialité"] || item.periode || item.specialite || "")
        const itemYear = Number.parseInt(String(item.annee || item["Année"] || "")) || 0

        if (itemArtist && current.artist && itemArtist.toLowerCase() === current.artist.toLowerCase()) {
          score += 50
        }

        if (itemSpecialty && current.specialty && itemSpecialty.toLowerCase() === current.specialty.toLowerCase()) {
          score += 30
        }

        if (current.materials && item.materiaux) {
          const currentMaterials = current.materials
            .toLowerCase()
            .split(/[,\s]+/)
            .filter((m) => m.length > 2)
          const itemMaterials = Array.isArray(item.materiaux)
            ? item.materiaux
                .join(", ")
                .toLowerCase()
                .split(/[,\s]+/)
                .filter((m) => m.length > 2)
            : String(item.materiaux || "")
                .toLowerCase()
                .split(/[,\s]+/)
                .filter((m) => m.length > 2)

          const commonMaterials = currentMaterials.filter((mat) =>
            itemMaterials.some((itemMat) => itemMat.includes(mat) || mat.includes(itemMat)),
          )
          score += commonMaterials.length * 15
        }

        if (currentYear > 0 && itemYear > 0) {
          const yearDiff = Math.abs(currentYear - itemYear)
          if (yearDiff === 0) score += 25
          else if (yearDiff <= 1) score += 20
          else if (yearDiff <= 2) score += 15
          else if (yearDiff <= 5) score += 10
          else if (yearDiff <= 10) score += 5
          else if (yearDiff <= 20) score += 2
        }

        if (current.name && item["Nom luminaire"]) {
          const currentWords = current.name
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3)
          const itemWords = String(item["Nom luminaire"])
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3)
          const commonWords = currentWords.filter((word) =>
            itemWords.some((itemWord) => itemWord.includes(word) || word.includes(itemWord)),
          )
          score += commonWords.length * 8
        }

        if (current.editeur && item.editeur && current.editeur.toLowerCase() === item.editeur.toLowerCase()) {
          score += 12
        }

        return {
          ...item,
          id: String(item._id || ""),
          artist: itemArtist,
          year: String(item.annee || item["Année"] || ""),
          name: String(item["Nom luminaire"] || item.nom || "Sans nom"),
          similarityScore: score,
          image: (() => {
            if (item.imageId) {
              return `/api/images/${item.imageId}`
            }
            if (item.filename || item["Nom du fichier"] || item["Image luminaire (Nom du fichier)"]) {
              const filename = item.filename || item["Nom du fichier"] || item["Image luminaire (Nom du fichier)"]
              return `/api/images/filename/${filename}`
            }
            return null
          })(),
        }
      })

    const topSimilar = scored
      .filter((item) => item.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 6)

    if (topSimilar.length < 6) {
      const remaining = scored
        .filter((item) => !topSimilar.includes(item) && item.similarityScore === 0)
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
      materials: "Matériaux",
      estimation: "estimation",
      editeur: "editeur",
      categorie: "categorie",
      lienSiteMarchand: "lienSiteMarchand",
      etiquette: "etiquette",
      bibliographie: "bibliographie",
    }

    const keyToUpdate = keyMapping[field] || field

    setLuminaire((prev: any) => ({ ...prev, [field]: value }))

    try {
      await fetch(`/api/luminaires/${luminaire._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [keyToUpdate]: value }),
      })

      if (field === "artist") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "Artiste / Dates": value }),
        })
      } else if (field === "specialty") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Spécialité: value }),
        })
      } else if (field === "collaboration") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "Collaboration / Œuvre": value }),
        })
      } else if (field === "categorie") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Catégorie: value }),
        })
      } else if (field === "lienSiteMarchand") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "Lien site marchand": value }),
        })
      } else if (field === "etiquette") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Etiquette: value }),
        })
      } else if (field === "bibliographie") {
        await fetch(`/api/luminaires/${luminaire._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Bibliographie: value }),
        })
      }
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

      pdf.setFontSize(20)
      pdf.text(String(luminaire.name || "Luminaire sans nom"), 20, 30)

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
      addField("Catégorie", luminaire.categorie)
      addField("Editeur", luminaire.editeur)
      addField("Année", luminaire.year)
      addField("Spécialité", luminaire.specialty)
      addField("Collaboration / Œuvre", luminaire.collaboration)
      addField("Description", luminaire.description)
      addField("Signé", luminaire.signed)
      addField("Dimensions", luminaire.dimensions)
      addField("Matériaux", luminaire.materials)
      addField("Lien site marchand", luminaire.lienSiteMarchand)

      if (canEdit) {
        addField("Étiquette", luminaire.etiquette)
      }

      addField("Bibliographie", luminaire.bibliographie)

      if (canSeeEstimation) {
        addField("Estimation", luminaire.estimation)
      }

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
                  const targetWidth = 400
                  const targetHeight = 400
                  canvas.width = targetWidth
                  canvas.height = targetHeight
                  ctx.drawImage(tempImg, 0, 0, targetWidth, targetHeight)
                  const dataURL = canvas.toDataURL("image/jpeg", 0.95)
                  pdf.addImage(dataURL, "JPEG", 20, yPos + 10, 150, 150)
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

      pdf.save(`${String(luminaire.name || "luminaire")}.pdf`)
    } catch (error) {
      console.error("❌ Erreur génération PDF:", error)
    } finally {
      setGeneratingPDF(false)
    }
  }

  const handleDeleteLuminaire = async (luminaireId: string) => {
    try {
      const response = await fetch(`/api/luminaires/${luminaireId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        window.location.href = "/luminaires"
      } else {
        alert(`Erreur lors de la suppression: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Erreur lors de la suppression: ${error.message}`)
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
    <div className="min-h-screen bg-[#f5f1e8] pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link href="/luminaires">
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
            </Link>

            <div className="flex items-center gap-4">
              {canEdit && (
                <DeleteLuminaireButton
                  luminaireId={String(luminaire?._id)}
                  luminaireName={String(luminaire?.name || "Luminaire")}
                  onDelete={() => handleDeleteLuminaire(String(luminaire?._id))}
                />
              )}
              {(userData?.role === "admin" || userData?.role === "premium") && (
                <Button
                  onClick={generatePDF}
                  className="bg-gray-900 text-white hover:bg-gray-800"
                  disabled={generatingPDF}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {generatingPDF ? "Génération..." : "PDF"}
                </Button>
              )}
              <FavoriteToggleButton isActive={isFavorite} onClick={toggleFavorite} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="aspect-square relative bg-gray-50">
              {luminaire.image ? (
                <Image
                  src={luminaire.image || "/placeholder.svg"}
                  alt={String(luminaire.name || "Luminaire")}
                  fill
                  className="object-contain p-8"
                  unoptimized
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl text-gray-400 mb-2">🏮</div>
                    <span className="text-sm text-gray-500 font-serif">Image non disponible</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <EditableField
                  value={luminaire.name || ""}
                  onSave={(v) => handleUpdate("name", v)}
                  className="text-2xl font-serif text-gray-900"
                  placeholder="Nom du luminaire"
                  disabled={!canEdit}
                />
                {canSeeEstimation && luminaire.estimation && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{luminaire.estimation}</div>
                    <div className="text-xs text-gray-500">AVAILABLE</div>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-600 mb-4">
                {luminaire.artist && (
                  <Link
                    href={`/designers/${encodeURIComponent(luminaire.artist)}`}
                    className="hover:underline font-medium"
                  >
                    {luminaire.artist}
                  </Link>
                )}
                {luminaire.year && <span>, {luminaire.year}</span>}
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-4">
                {luminaire.categorie && (
                  <div className="flex">
                    <span className="text-sm font-medium text-gray-700 w-32">Catégorie</span>
                    <EditableField
                      value={luminaire.categorie || ""}
                      onSave={(v) => handleUpdate("categorie", v)}
                      className="text-sm text-gray-900 flex-1"
                      disabled={!canEdit}
                    />
                  </div>
                )}
                {luminaire.materials && (
                  <div className="flex">
                    <span className="text-sm font-medium text-gray-700 w-32">Matériaux</span>
                    <EditableField
                      value={luminaire.materials || ""}
                      onSave={(v) => handleUpdate("materials", v)}
                      className="text-sm text-gray-900 flex-1"
                      disabled={!canEdit}
                    />
                  </div>
                )}
                {luminaire.dimensions && (
                  <div className="flex">
                    <span className="text-sm font-medium text-gray-700 w-32">Dimensions</span>
                    <EditableField
                      value={luminaire.dimensions || ""}
                      onSave={(v) => handleUpdate("dimensions", v)}
                      className="text-sm text-gray-900 flex-1"
                      disabled={!canEdit}
                    />
                  </div>
                )}
                {luminaire.editeur && (
                  <div className="flex">
                    <span className="text-sm font-medium text-gray-700 w-32">Éditeur</span>
                    <EditableField
                      value={luminaire.editeur || ""}
                      onSave={(v) => handleUpdate("editeur", v)}
                      className="text-sm text-gray-900 flex-1"
                      disabled={!canEdit}
                    />
                  </div>
                )}
                {luminaire.signed && (
                  <div className="flex">
                    <span className="text-sm font-medium text-gray-700 w-32">Signé</span>
                    <EditableField
                      value={luminaire.signed || ""}
                      onSave={(v) => handleUpdate("signed", v)}
                      className="text-sm text-gray-900 flex-1"
                      disabled={!canEdit}
                    />
                  </div>
                )}
              </div>

              {luminaire.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <EditableField
                    value={luminaire.description || ""}
                    onSave={(v) => handleUpdate("description", v)}
                    className="text-sm text-gray-600"
                    multiline
                    disabled={!canEdit}
                  />
                </div>
              )}

              <button className="w-full mt-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <span>Request Information</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {similarLuminaires.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif text-gray-900">More from {luminaire.artist || "this designer"}</h2>
                <Link href="/luminaires" className="text-sm text-gray-600 hover:text-gray-900">
                  View All
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {similarLuminaires.slice(0, 6).map((similar) => (
                  <Link key={similar.id} href={`/luminaires/${similar.id}`} className="block">
                    <div className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square relative">
                        {similar.image ? (
                          <Image
                            src={similar.image || "/placeholder.svg"}
                            alt={similar.name}
                            fill
                            className="object-contain p-4"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <div className="text-4xl">🏮</div>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-serif text-sm text-gray-900 mb-1 line-clamp-2">{similar.name}</h3>
                        <p className="text-xs text-gray-600">{similar.year}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
