"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Download, Search, User, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { useAuth } from "@/contexts/AuthContext"
import jsPDF from "jspdf"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"
import MobileFooter from "@/components/MobileFooter"

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
            designerImageFilename: result.data.designerImageFilename || result.data["Image du designer"] || "",

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
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20

      pdf.setFillColor(245, 241, 232) // #f5f1e8
      pdf.rect(0, 0, pageWidth, pageHeight, "F")

      pdf.setFont("times", "bold")
      pdf.setFontSize(24)
      pdf.setTextColor(60, 60, 60)
      pdf.text("GERSAINT", margin, margin)

      // Luminaire name
      pdf.setFontSize(18)
      pdf.setTextColor(40, 40, 40)
      const nameY = margin + 15
      pdf.text(luminaire.name || "Sans nom", margin, nameY)

      // Artist and year
      pdf.setFont("times", "italic")
      pdf.setFontSize(12)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`${luminaire.artist}${luminaire.year ? `, ${luminaire.year}` : ""}`, margin, nameY + 8)

      let yPosition = nameY + 20

      if (luminaire.filename) {
        try {
          const imageUrl = `/api/images/filename/${luminaire.filename}`
          const img = await fetch(imageUrl)
          const blob = await img.blob()
          const reader = new FileReader()

          await new Promise((resolve) => {
            reader.onloadend = () => {
              const base64data = reader.result as string
              const imgWidth = 80
              const imgHeight = 80
              const imgX = (pageWidth - imgWidth) / 2

              pdf.addImage(base64data, "JPEG", imgX, yPosition, imgWidth, imgHeight)
              yPosition += imgHeight + 15
              resolve(null)
            }
            reader.readAsDataURL(blob)
          })
        } catch (error) {
          console.error("Error loading image for PDF:", error)
        }
      }

      pdf.setDrawColor(139, 115, 85) // #8b7355
      pdf.setLineWidth(0.5)
      pdf.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 10

      pdf.setFont("times", "normal")
      pdf.setFontSize(11)
      pdf.setTextColor(60, 60, 60)

      const addField = (label: string, value: string) => {
        if (value && value.trim()) {
          pdf.setFont("times", "bold")
          pdf.text(`${label}:`, margin, yPosition)
          pdf.setFont("times", "normal")
          const splitText = pdf.splitTextToSize(value, pageWidth - margin * 2 - 30)
          pdf.text(splitText, margin + 30, yPosition)
          yPosition += splitText.length * 6 + 3
        }
      }

      addField("Signé", luminaire.signed || "Non")
      addField("Année", luminaire.year || "Inconnue")
      addField("Catégorie", luminaire.categorie || "")
      addField("Éditeur", luminaire.editeur || "")
      addField("Matériaux", luminaire.materials || "")
      addField("Dimensions", luminaire.dimensions || "")

      if (canSeeEstimation && luminaire.estimation) {
        addField("Estimation", luminaire.estimation)
      }

      addField("Bibliographie", luminaire.bibliographie || "")
      addField("Lien site marchand", luminaire.lienSiteMarchand || "")

      if (luminaire.description && luminaire.description.trim()) {
        yPosition += 5
        pdf.setFont("times", "bold")
        pdf.setFontSize(12)
        pdf.text("Description", margin, yPosition)
        yPosition += 7

        pdf.setFont("times", "normal")
        pdf.setFontSize(10)
        const descLines = pdf.splitTextToSize(luminaire.description, pageWidth - margin * 2)
        pdf.text(descLines, margin, yPosition)
      }

      pdf.setFontSize(9)
      pdf.setTextColor(139, 115, 85)
      pdf.text("www.gersaintparis.com", pageWidth / 2, pageHeight - 10, { align: "center" })

      pdf.save(`${luminaire.name || "luminaire"}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 md:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/luminaires" className="p-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-lg font-serif text-gray-900 font-medium line-clamp-1 flex-1 mx-2">
            {luminaire?.artist} - {luminaire?.name}
          </h1>
          <button className="p-2">
            <Search className="w-6 h-6 text-gray-900" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Desktop back button */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <Link href="/luminaires">
              <Button variant="outline" className="flex items-center gap-2 bg-white">
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
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="aspect-[4/3] max-w-2xl mx-auto relative bg-transparent flex items-center justify-center">
              <button
                onClick={toggleFavorite}
                className="absolute top-6 right-6 z-10 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-md hover:scale-110 transition-transform"
              >
                <span className={`text-xl ${isFavorite ? "text-red-500" : "text-gray-400"}`}>♥</span>
              </button>

              {luminaire.image ? (
                <div className="relative w-full h-full">
                  <Image
                    src={luminaire.image || "/placeholder.svg"}
                    alt={String(luminaire.name || "Luminaire")}
                    fill
                    className="object-contain"
                    unoptimized
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl text-gray-400 mb-2">🏮</div>
                    <span className="text-sm text-gray-500 font-serif">Image non disponible</span>
                  </div>
                </div>
              )}
            </div>

            {/* Content section */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <EditableField
                    value={luminaire.name || ""}
                    onSave={(val) => handleUpdate("name", val)}
                    className="text-2xl font-serif text-gray-900 mb-2"
                    placeholder="Nom du luminaire"
                    disabled={!canEdit}
                  />
                </div>

                {canSeeEstimation && luminaire.estimation && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Estimation</div>
                    <EditableField
                      value={luminaire.estimation}
                      onSave={(val) => handleUpdate("estimation", val)}
                      className="text-xl font-semibold text-gray-900"
                      placeholder="Prix"
                      disabled={!canEdit}
                    />
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center justify-between hover:bg-gray-100 transition-colors cursor-pointer">
                <Link
                  href={`/designers/${encodeURIComponent(luminaire.artist)}`}
                  className="flex items-center gap-3 flex-1"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                    {luminaire.designerImageFilename ? (
                      <Image
                        src={`/api/images/filename/${luminaire.designerImageFilename}`}
                        alt={luminaire.artist}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                        unoptimized
                        onError={(e) => {
                          console.error("[v0] Failed to load designer image:", luminaire.designerImageFilename)
                          const target = e.currentTarget
                          target.style.display = "none"
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML =
                              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-user w-6 h-6 text-gray-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
                          }
                        }}
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{luminaire.artist}</div>
                    <p className="text-sm text-gray-600">Designer</p>
                  </div>
                </Link>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-4">
                {((luminaire.year && luminaire.year.trim()) || canEdit) && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Année</p>
                    <EditableField
                      value={luminaire.year || ""}
                      onSave={(value) => handleUpdate("year", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter année..."
                    />
                  </div>
                )}

                {((luminaire.categorie && luminaire.categorie.trim()) || canEdit) && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Catégorie</p>
                    <EditableField
                      value={luminaire.categorie || ""}
                      onSave={(value) => handleUpdate("categorie", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter catégorie..."
                    />
                  </div>
                )}

                {((luminaire.materials && luminaire.materials.trim()) || canEdit) && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Matériaux</p>
                    <EditableField
                      value={luminaire.materials || ""}
                      onSave={(value) => handleUpdate("materials", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter matériaux..."
                    />
                  </div>
                )}

                {((luminaire.dimensions && luminaire.dimensions.trim()) || canEdit) && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Dimensions</p>
                    <EditableField
                      value={luminaire.dimensions || ""}
                      onSave={(value) => handleUpdate("dimensions", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter dimensions..."
                    />
                  </div>
                )}

                {((luminaire.editeur && luminaire.editeur.trim()) || canEdit) && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Éditeur</p>
                    <EditableField
                      value={luminaire.editeur || ""}
                      onSave={(value) => handleUpdate("editeur", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter éditeur..."
                    />
                  </div>
                )}

                {((luminaire.estimation && luminaire.estimation.trim()) || canEdit) && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Estimation</p>
                    <EditableField
                      value={luminaire.estimation || ""}
                      onSave={(value) => handleUpdate("estimation", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter estimation..."
                    />
                  </div>
                )}

                {((luminaire.bibliographie && luminaire.bibliographie.trim()) || canEdit) && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bibliographie</p>
                    <EditableField
                      value={luminaire.bibliographie || ""}
                      onSave={(value) => handleUpdate("bibliographie", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter bibliographie..."
                    />
                  </div>
                )}

                {((luminaire.lienSiteMarchand && luminaire.lienSiteMarchand.trim()) || canEdit) && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Lien site marchand</p>
                    <EditableField
                      value={luminaire.lienSiteMarchand || ""}
                      onSave={(value) => handleUpdate("lienSiteMarchand", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter lien..."
                    />
                  </div>
                )}

                {luminaire.signed && luminaire.signed.trim() && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Signé</p>
                    <EditableField
                      value={luminaire.signed}
                      onSave={(value) => handleUpdate("signed", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                    />
                  </div>
                )}

                {luminaire.categorie && luminaire.categorie.trim() && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Catégorie</p>
                    <EditableField
                      value={luminaire.categorie}
                      onSave={(value) => handleUpdate("categorie", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                    />
                  </div>
                )}

                {luminaire.materials && luminaire.materials.trim() && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Matériaux</p>
                    <EditableField
                      value={luminaire.materials}
                      onSave={(value) => handleUpdate("materials", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                    />
                  </div>
                )}

                {luminaire.dimensions && luminaire.dimensions.trim() && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Dimensions</p>
                    <EditableField
                      value={luminaire.dimensions}
                      onSave={(value) => handleUpdate("dimensions", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                    />
                  </div>
                )}

                {luminaire.editeur && luminaire.editeur.trim() && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Éditeur</p>
                    <EditableField
                      value={luminaire.editeur}
                      onSave={(value) => handleUpdate("editeur", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                    />
                  </div>
                )}

                {luminaire.bibliographie && luminaire.bibliographie.trim() && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bibliographie</p>
                    <EditableField
                      value={luminaire.bibliographie}
                      onSave={(value) => handleUpdate("bibliographie", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                    />
                  </div>
                )}

                {luminaire.lienSiteMarchand && luminaire.lienSiteMarchand.trim() && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Lien site marchand</p>
                    <EditableField
                      value={luminaire.lienSiteMarchand}
                      onSave={(value) => handleUpdate("lienSiteMarchand", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                    />
                  </div>
                )}

                {canEdit && luminaire.specialty && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Spécialité / Période</p>
                    <EditableField
                      value={luminaire.specialty}
                      onSave={(value) => handleUpdate("specialty", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                    />
                  </div>
                )}

                {canEdit && luminaire.collaboration && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Collaboration / Œuvre</p>
                    <EditableField
                      value={luminaire.collaboration}
                      onSave={(value) => handleUpdate("collaboration", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                    />
                  </div>
                )}

                {canEdit && luminaire.etiquette && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Étiquette</p>
                    <EditableField
                      value={luminaire.etiquette}
                      onSave={(value) => handleUpdate("etiquette", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                    />
                  </div>
                )}

                {canEdit && !luminaire.signed && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Signé</p>
                    <EditableField
                      value=""
                      onSave={(value) => handleUpdate("signed", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter signature..."
                    />
                  </div>
                )}

                {canEdit && !luminaire.bibliographie && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bibliographie</p>
                    <EditableField
                      value=""
                      onSave={(value) => handleUpdate("bibliographie", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter bibliographie..."
                    />
                  </div>
                )}

                {canEdit && !luminaire.etiquette && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Étiquette</p>
                    <EditableField
                      value=""
                      onSave={(value) => handleUpdate("etiquette", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter étiquette..."
                    />
                  </div>
                )}

                {canEdit && !luminaire.lienSiteMarchand && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Lien site marchand</p>
                    <EditableField
                      value=""
                      onSave={(value) => handleUpdate("lienSiteMarchand", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter lien..."
                    />
                  </div>
                )}

                {canEdit && !luminaire.specialty && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Spécialité / Période</p>
                    <EditableField
                      value=""
                      onSave={(value) => handleUpdate("specialty", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter période..."
                    />
                  </div>
                )}

                {canEdit && !luminaire.collaboration && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Collaboration / Œuvre</p>
                    <EditableField
                      value=""
                      onSave={(value) => handleUpdate("collaboration", value)}
                      canEdit={canEdit}
                      className="text-gray-900"
                      placeholder="Ajouter collaboration..."
                    />
                  </div>
                )}
              </div>

              {luminaire.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-serif font-medium text-gray-900 mb-3">Description</h3>
                  <EditableField
                    value={luminaire.description}
                    onSave={(val) => handleUpdate("description", val)}
                    multiline
                    className="text-sm text-gray-700 leading-relaxed"
                    placeholder="Description du luminaire"
                    disabled={!canEdit}
                  />
                </div>
              )}

              {(userData?.role === "admin" || userData?.role === "premium") && (
                <button
                  onClick={generatePDF}
                  disabled={generatingPDF}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-[#8b7355] text-white rounded-lg hover:bg-[#75614a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  {generatingPDF ? "Génération..." : "Télécharger PDF"}
                </button>
              )}
            </div>
          </div>

          {/* Similar luminaires section */}
          {similarLuminaires.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif font-medium text-gray-900">
                  Plus de {luminaire.artist?.split("(")[0]?.trim()}
                </h2>
                <Link
                  href={`/luminaires?designer=${encodeURIComponent(luminaire.artist || "")}`}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Voir tout
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {similarLuminaires.slice(0, 4).map((similar) => (
                  <Link key={similar._id} href={`/luminaires/${similar._id}`} className="block">
                    <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-gray-200">
                      <div className="aspect-square relative bg-gray-100 overflow-hidden">
                        {similar.filename ? (
                          <Image
                            src={`/api/images/filename/${similar.filename}`}
                            alt={similar["Nom luminaire"] || "Luminaire"}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <div className="text-4xl">🏮</div>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-serif text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                          {similar["Nom luminaire"] || "Sans nom"}
                        </h3>
                        <p className="text-xs text-gray-600">{similar.year || "Année inconnue"}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <MobileFooter />
    </div>
  )
}
