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
            .filter((m: string) => m.length > 2)
          const itemMaterials = Array.isArray(item.materiaux)
            ? item.materiaux
                .join(", ")
                .toLowerCase()
                .split(/[,\s]+/)
                .filter((m: string) => m.length > 2)
            : String(item.materiaux || "")
                .toLowerCase()
                .split(/[,\s]+/)
                .filter((m: string) => m.length > 2)

          const commonMaterials = currentMaterials.filter((mat: string) =>
            itemMaterials.some((itemMat: string) => itemMat.includes(mat) || mat.includes(itemMat)),
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
            .filter((w: string) => w.length > 3)
          const itemWords = String(item["Nom luminaire"])
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 3)
          const commonWords = currentWords.filter((word: string) =>
            itemWords.some((itemWord: string) => itemWord.includes(word) || word.includes(itemWord)),
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
      const marginX = 15

      // Fond blanc
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, pageWidth, pageHeight, "F")

      // ── 1. LOGO ──
      let logoLoaded = false
      try {
        const logoUrl = `${window.location.origin}/images/gersaint-logo.png`
        const logoResponse = await fetch(logoUrl)
        const logoBlob = await logoResponse.blob()
        const logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(logoBlob)
        })
        const logoW = 50
        const logoH = 25
        pdf.addImage(logoBase64, "PNG", (pageWidth - logoW) / 2, 15, logoW, logoH)
        logoLoaded = true
      } catch {
        // fallback ci-dessous
      }
      if (!logoLoaded) {
        pdf.setFont("times", "bold")
        pdf.setFontSize(24)
        pdf.setTextColor(60, 60, 60)
        pdf.text("GERSAINT", pageWidth / 2, 30, { align: "center" })
      }

      // ── 2. NOM + DESIGNER (sans année) ──
      pdf.setFont("times", "bold")
      pdf.setFontSize(18)
      pdf.setTextColor(40, 40, 40)
      pdf.text(luminaire.name || "Sans nom", marginX, 54)

      pdf.setFont("times", "italic")
      pdf.setFontSize(12)
      pdf.setTextColor(100, 100, 100)
      pdf.text(luminaire.artist || "", marginX, 62)

      // ── 3. IMAGE ──
      let yAfterImage = 70
      if (luminaire.filename) {
        try {
          const imageUrl = `/api/images/filename/${luminaire.filename}`
          const imgBlob = await (await fetch(imageUrl)).blob()
          const imgBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(imgBlob)
          })
          const imgW = 80
          const imgH = 80
          pdf.addImage(imgBase64, "JPEG", (pageWidth - imgW) / 2, 68, imgW, imgH)
          yAfterImage = 68 + imgH + 10
        } catch {
          // pas d'image
        }
      }

      // ── 4. DEUX COLONNES ──
      const colLeftX  = 15
      const colRightX = 110
      const colWidth  = 85
      let yLeft  = yAfterImage + 8
      let yRight = yAfterImage + 8

      const drawField = (x: number, y: number, label: string, value: string): number => {
        pdf.setFont("times", "bold")
        pdf.setFontSize(10)
        pdf.setTextColor(61, 43, 31)   // #3d2b1f
        pdf.text(label, x, y)
        const labelH = 4.5
        pdf.setFont("times", "normal")
        pdf.setTextColor(85, 85, 85)   // #555555
        const lines = pdf.splitTextToSize(value, colWidth)
        pdf.text(lines, x, y + labelH)
        return y + labelH + lines.length * 3.8 + 2
      }

      const addLeft = (label: string, value: string | undefined) => {
        if (!value || !value.trim()) return
        yLeft = drawField(colLeftX, yLeft, label, value)
      }

      const addRight = (label: string, value: string | undefined) => {
        if (!value || !value.trim()) return
        yRight = drawField(colRightX, yRight, label, value)
      }

      // Colonne gauche
      addLeft("Éditeur",    luminaire.editeur)
      addLeft("Année",      luminaire.year)
      addLeft("Signé",      luminaire.signed)
      if (canSeeEstimation) addLeft("Estimation", luminaire.estimation)

      // Colonne droite
      addRight("Catégorie", luminaire.categorie)
      addRight("Dimensions", luminaire.dimensions)
      addRight("Matériaux", luminaire.materials)
      addRight("Puissance", luminaire.puissance || luminaire.power)

      // ── 5. DESCRIPTION + BIBLIOGRAPHIE ──
      const yBelowCols = Math.max(yLeft, yRight) + 1

      let yText = yBelowCols + 8

      if (luminaire.description && luminaire.description.trim()) {
        pdf.setFont("times", "bold")
        pdf.setFontSize(12)
        pdf.setTextColor(61, 43, 31)
        pdf.text("Description", marginX, yText)
        yText += 6
        pdf.setFont("times", "normal")
        pdf.setFontSize(10)
        pdf.setTextColor(85, 85, 85)
        const descLines = pdf.splitTextToSize(luminaire.description, pageWidth - marginX * 2)
        pdf.text(descLines, marginX, yText)
        yText += descLines.length * 3.8 + 6
      }

      if (luminaire.bibliographie && luminaire.bibliographie.trim()) {
        pdf.setFont("times", "bold")
        pdf.setFontSize(12)
        pdf.setTextColor(61, 43, 31)
        pdf.text("Bibliographie", marginX, yText)
        yText += 6
        pdf.setFont("times", "normal")
        pdf.setFontSize(10)
        pdf.setTextColor(85, 85, 85)
        const biblioLines = pdf.splitTextToSize(luminaire.bibliographie, pageWidth - marginX * 2)
        pdf.text(biblioLines, marginX, yText)
      }

      // Footer
      pdf.setFontSize(9)
      pdf.setTextColor(60, 60, 60)
      pdf.setFont("times", "bold")
      pdf.text("GERSAINT PARIS", pageWidth / 2, pageHeight - 14, { align: "center" })
      pdf.setFont("times", "normal")
      pdf.text("42 rue de Maubeuge, 75009", pageWidth / 2, pageHeight - 10, { align: "center" })
      pdf.text("contact@gersaintparis.fr", pageWidth / 2, pageHeight - 6, { align: "center" })

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

                {/* MODIFICATION ICI : canSeeEstimation && (luminaire.estimation || canEdit) */}
                {canSeeEstimation && (luminaire.estimation || canEdit) && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Estimation</div>
                    <EditableField
                      value={luminaire.estimation || ""}
                      onSave={(val) => handleUpdate("estimation", val)}
                      className="text-xl font-semibold text-gray-900"
                      placeholder="Prix"
                      disabled={!canEdit}
                    />
                  </div>
                )}
              </div>

              {/* Designer section - unchanged */}
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

              {/* Description visible for all, editable only for admin */}
              {(luminaire.description || canEdit) && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Description</h3>
                  <EditableField
                    value={luminaire.description || ""}
                    onSave={(val) => handleUpdate("description", val)}
                    multiline
                    className="text-sm text-gray-700 leading-relaxed"
                    placeholder={canEdit ? "Ajouter une description..." : "—"}
                    disabled={!canEdit}
                  />
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-y-2 gap-x-8 mb-4 text-sm">
                  {((luminaire.editeur && luminaire.editeur.trim()) || canEdit) && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-gray-500 min-w-[70px] sm:min-w-0">Éditeur</span>
                      <EditableField
                        value={luminaire.editeur || ""}
                        onSave={(value) => handleUpdate("editeur", value)}
                        className="text-gray-900 font-medium"
                        placeholder="—"
                        disabled={!canEdit}
                      />
                    </div>
                  )}

                  {((luminaire.year && luminaire.year.trim()) || canEdit) && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-gray-500 min-w-[70px] sm:min-w-0">Année</span>
                      <EditableField
                        value={luminaire.year || ""}
                        onSave={(value) => handleUpdate("year", value)}
                        className="text-gray-900 font-medium"
                        placeholder="—"
                        disabled={!canEdit}
                      />
                    </div>
                  )}

                  {((luminaire.signed && luminaire.signed.trim()) || canEdit) && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-gray-500 min-w-[70px] sm:min-w-0">Signé</span>
                      <EditableField
                        value={luminaire.signed || ""}
                        onSave={(value) => handleUpdate("signed", value)}
                        className="text-gray-900 font-medium"
                        placeholder="—"
                        disabled={!canEdit}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-y-2 gap-x-8 mb-4 text-sm">
                  {((luminaire.categorie && luminaire.categorie.trim()) || canEdit) && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-gray-500 min-w-[70px] sm:min-w-0">Catégorie</span>
                      <EditableField
                        value={luminaire.categorie || ""}
                        onSave={(value) => handleUpdate("categorie", value)}
                        className="text-gray-900 font-medium"
                        placeholder="—"
                        disabled={!canEdit}
                      />
                    </div>
                  )}

                  {((luminaire.materials && luminaire.materials.trim()) || canEdit) && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-gray-500 min-w-[70px] sm:min-w-0">Matériaux</span>
                      <EditableField
                        value={luminaire.materials || ""}
                        onSave={(value) => handleUpdate("materials", value)}
                        className="text-gray-900 font-medium"
                        placeholder="—"
                        disabled={!canEdit}
                      />
                    </div>
                  )}

                  {((luminaire.dimensions && luminaire.dimensions.trim()) || canEdit) && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-gray-500 min-w-[70px] sm:min-w-0">Dimensions</span>
                      <EditableField
                        value={luminaire.dimensions || ""}
                        onSave={(value) => handleUpdate("dimensions", value)}
                        className="text-gray-900 font-medium"
                        placeholder="—"
                        disabled={!canEdit}
                      />
                    </div>
                  )}
                </div>

                {((luminaire.lienSiteMarchand && luminaire.lienSiteMarchand.trim()) || canEdit) && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mb-3 text-sm">
                    <span className="text-gray-500 shrink-0 min-w-[70px] sm:min-w-0">Lien marchand</span>
                    <EditableField
                      value={luminaire.lienSiteMarchand || ""}
                      onSave={(value) => handleUpdate("lienSiteMarchand", value)}
                      className="text-[#8b7355] hover:underline break-all"
                      placeholder="—"
                      disabled={!canEdit}
                    />
                  </div>
                )}

                {((luminaire.bibliographie && luminaire.bibliographie.trim()) || canEdit) && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mb-3 text-sm">
                    <span className="text-gray-500 shrink-0 min-w-[70px] sm:min-w-0">Bibliographie</span>
                    <EditableField
                      value={luminaire.bibliographie || ""}
                      onSave={(value) => handleUpdate("bibliographie", value)}
                      className="text-gray-900"
                      placeholder="—"
                      disabled={!canEdit}
                    />
                  </div>
                )}

                {canEdit && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mb-3 text-sm">
                    <span className="text-gray-500 shrink-0 min-w-[70px] sm:min-w-0">Étiquette</span>
                    <EditableField
                      value={luminaire.etiquette || ""}
                      onSave={(value) => handleUpdate("etiquette", value)}
                      className="text-gray-900"
                      placeholder="—"
                      disabled={!canEdit}
                    />
                  </div>
                )}
              </div>

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
              <h2 className="text-xl font-serif font-medium text-gray-900 mb-6">
                Plus de {luminaire.artist?.split("(")[0]?.trim()}
              </h2>

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
