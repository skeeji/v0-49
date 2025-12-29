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
            designerImage: result.data.designerImage || result.data["Image du designer"] || "",

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
            <div className="aspect-[4/3] max-w-2xl mx-auto relative bg-transparent p-4 flex items-center justify-center">
              <button
                onClick={toggleFavorite}
                className="absolute top-6 right-6 z-10 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-md hover:scale-110 transition-transform"
              >
                <span className={`text-xl ${isFavorite ? "text-red-500" : "text-gray-400"}`}>♥</span>
              </button>

              {luminaire.image ? (
                <div className="relative w-full h-full max-w-md max-h-[400px]">
                  <Image
                    src={luminaire.image || "/placeholder.svg"}
                    alt={String(luminaire.name || "Luminaire")}
                    fill
                    className="object-contain rounded-2xl"
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
                  <EditableField
                    value={`${luminaire.artist || ""}, ca ${luminaire.year || ""}`}
                    onSave={(val) => {
                      const match = val.match(/^(.*?),\s*ca\s*(\d+)/)
                      if (match) {
                        handleUpdate("artist", match[1].trim())
                        handleUpdate("year", match[2])
                      }
                    }}
                    className="text-sm text-gray-600"
                    placeholder="Artiste, ca année"
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
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {luminaire.designerImage ? (
                      <Image
                        src={`/api/images/filename/${luminaire.designerImage}`}
                        alt={luminaire.artist}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                        unoptimized
                        onError={(e) => {
                          console.error("[v0] Failed to load designer image:", luminaire.designerImage)
                          const target = e.currentTarget
                          target.style.display = "none"
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML =
                              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-6 h-6 text-gray-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
                          }
                        }}
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <EditableField
                      value={luminaire.artist}
                      onSave={(value) => handleUpdate("artist", value)}
                      canEdit={canEdit}
                      className="font-semibold text-gray-900"
                      style={{ whiteSpace: "pre-wrap" }}
                    />
                    <p className="text-sm text-gray-600">Designer</p>
                  </div>
                </Link>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
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

                {luminaire.year && luminaire.year.trim() && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Année</p>
                    <EditableField
                      value={luminaire.year}
                      onSave={(value) => handleUpdate("year", value)}
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
                <Button
                  onClick={generatePDF}
                  className="w-full text-white hover:bg-[#7a6345]"
                  style={{ backgroundColor: "#8b7355" }}
                  disabled={generatingPDF}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {generatingPDF ? "Génération du PDF..." : "Télécharger PDF"}
                </Button>
              )}
            </div>
          </div>

          {/* Similar luminaires section */}
          {similarLuminaires.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif text-gray-900">Plus de {luminaire.artist}</h2>
                <Link
                  href={`/designers/${encodeURIComponent(luminaire.artist)}`}
                  className="text-sm text-[#8b7355] hover:underline"
                >
                  Voir tout
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {similarLuminaires.slice(0, 6).map((similar) => (
                  <Link key={similar.id} href={`/luminaires/${similar.id}`}>
                    <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-square relative bg-gray-50">
                        {similar.image ? (
                          <Image
                            src={similar.image || "/placeholder.svg"}
                            alt={similar.name}
                            fill
                            unoptimized
                            className="object-contain rounded-t-xl"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg"
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">🏮</div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{similar.name}</h3>
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
