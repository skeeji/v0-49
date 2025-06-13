"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableField } from "@/components/EditableField"
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton"
import { useAuth } from "@/contexts/AuthContext"
import jsPDF from "jspdf"

export default function LuminaireDetailPage() {
  const params = useParams()
  const [luminaire, setLuminaire] = useState<any>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [similarLuminaires, setSimilarLuminaires] = useState([])
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const { userData } = useAuth()

  // Vérifier si l'utilisateur peut modifier les champs
  const canEdit = userData?.role === "admin"

  useEffect(() => {
    const storedLuminaires = localStorage.getItem("luminaires")
    if (storedLuminaires) {
      const luminaires = JSON.parse(storedLuminaires)
      const found = luminaires.find((item: any) => item.id === params.id)
      setLuminaire(found)

      // Trouver des luminaires similaires
      if (found) {
        const similar = findSimilarLuminaires(found, luminaires)
        setSimilarLuminaires(similar)
      }
    }

    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
    setIsFavorite(favorites.includes(params.id))
  }, [params.id])

  const findSimilarLuminaires = (currentLuminaire: any, allLuminaires: any[]) => {
    const currentYear = Number.parseInt(currentLuminaire.year) || 0

    // Filtrer et scorer les luminaires
    const scored = allLuminaires
      .filter((item) => item.id !== currentLuminaire.id) // Exclure le luminaire actuel
      .map((item) => {
        let score = 0

        // Même artiste = +3 points
        if (
          item.artist &&
          currentLuminaire.artist &&
          item.artist.toLowerCase() === currentLuminaire.artist.toLowerCase()
        ) {
          score += 3
        }

        // Même spécialité = +2 points
        if (
          item.specialty &&
          currentLuminaire.specialty &&
          item.specialty.toLowerCase() === currentLuminaire.specialty.toLowerCase()
        ) {
          score += 2
        }

        // Année proche = +1 point (±10 ans)
        const itemYear = Number.parseInt(item.year) || 0
        if (currentYear > 0 && itemYear > 0) {
          const yearDiff = Math.abs(currentYear - itemYear)
          if (yearDiff <= 10) {
            score += 1
          }
        }

        // Bonus si même collaboration/œuvre
        if (
          item.collaboration &&
          currentLuminaire.collaboration &&
          item.collaboration.toLowerCase().includes(currentLuminaire.collaboration.toLowerCase())
        ) {
          score += 1
        }

        return { ...item, similarityScore: score }
      })
      .filter((item) => item.similarityScore > 0) // Garder seulement ceux avec un score
      .sort((a, b) => b.similarityScore - a.similarityScore) // Trier par score décroissant
      .slice(0, 6) // Limiter à 6 résultats

    return scored
  }

  const handleUpdate = (field: string, value: string) => {
    // Vérifier si l'utilisateur a les droits d'édition
    if (!canEdit) return

    const storedLuminaires = localStorage.getItem("luminaires")
    if (storedLuminaires) {
      const luminaires = JSON.parse(storedLuminaires)
      const updated = luminaires.map((item: any) => (item.id === params.id ? { ...item, [field]: value } : item))
      localStorage.setItem("luminaires", JSON.stringify(updated))
      setLuminaire({ ...luminaire, [field]: value })

      // Recalculer les luminaires similaires
      const updatedLuminaire = { ...luminaire, [field]: value }
      const similar = findSimilarLuminaires(updatedLuminaire, updated)
      setSimilarLuminaires(similar)
    }
  }

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]")
    const newFavorites = isFavorite ? favorites.filter((id: string) => id !== params.id) : [...favorites, params.id]

    localStorage.setItem("favorites", JSON.stringify(newFavorites))
    setIsFavorite(!isFavorite)
  }

  const generatePDF = async () => {
    if (generatingPDF) return
    setGeneratingPDF(true)

    try {
      // Créer un nouveau document PDF au format A4
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Ajouter une police personnalisée
      doc.setFont("helvetica", "bold")

      // En-tête
      doc.setFontSize(18)
      doc.text("FICHE TECHNIQUE LUMINAIRE", 105, 20, { align: "center" })

      // Ligne de séparation
      doc.setLineWidth(0.5)
      doc.line(20, 25, 190, 25)

      // Position initiale pour le contenu
      let yPosition = 40
      let imageAdded = false

      // Ajouter l'image du luminaire si elle existe
      if (luminaire.image && !luminaire.image.includes("placeholder.svg")) {
        try {
          // Créer un élément image DOM pour charger l'image
          const imgElement = document.createElement("img")

          // Définir l'attribut crossOrigin pour éviter les problèmes CORS
          imgElement.crossOrigin = "anonymous"

          // Attendre que l'image soit chargée
          await new Promise((resolve, reject) => {
            imgElement.onload = resolve
            imgElement.onerror = reject

            // Si l'URL est un blob, l'utiliser directement
            if (luminaire.image.startsWith("blob:")) {
              imgElement.src = luminaire.image
            } else {
              // Sinon, utiliser un placeholder
              imgElement.src = "/placeholder.svg?height=300&width=300&text=Image+non+disponible"
            }
          })

          // Créer un canvas pour manipuler l'image
          const canvas = document.createElement("canvas")
          canvas.width = imgElement.naturalWidth || 300
          canvas.height = imgElement.naturalHeight || 300

          // Dessiner l'image sur le canvas
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height)

            // Convertir en base64
            const imgData = canvas.toDataURL("image/jpeg", 0.8)

            // Calculer les dimensions pour le PDF
            const maxWidth = 80 // 80mm de large max
            const imgRatio = canvas.height / canvas.width
            const imgWidth = Math.min(maxWidth, 80)
            const imgHeight = imgWidth * imgRatio

            // Centrer l'image horizontalement
            const xPosition = (210 - imgWidth) / 2 // 210mm = largeur A4

            // Ajouter l'image au PDF
            doc.addImage(imgData, "JPEG", xPosition, yPosition, imgWidth, imgHeight)

            // Mettre à jour la position Y pour le texte suivant
            yPosition += imgHeight + 15
            imageAdded = true
          }
        } catch (error) {
          console.error("Erreur lors de l'ajout de l'image au PDF:", error)

          // Ajouter un texte de remplacement
          doc.setFont("helvetica", "italic")
          doc.setFontSize(10)
          doc.text("Image non disponible dans le PDF - Consultez l'application", 105, yPosition + 20, {
            align: "center",
          })
          yPosition += 40
        }
      }

      // Si l'image n'a pas été ajoutée, ajuster la position Y
      if (!imageAdded) {
        yPosition = 35
      }

      // Configuration pour le texte
      const lineHeight = 10
      const labelWidth = 45
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")

      // Fonction pour ajouter une ligne d'information avec gestion du texte long
      const addInfoLine = (label: string, value: string, isMultiline = false) => {
        if (!value || !value.trim()) return

        // Label en gras
        doc.setFont("helvetica", "bold")
        doc.text(label + ":", 20, yPosition)

        // Valeur en normal
        doc.setFont("helvetica", "normal")

        if (isMultiline) {
          // Gérer le texte multiligne avec retour à la ligne automatique
          const maxWidth = 125 // Largeur maximale pour le texte
          const lines = doc.splitTextToSize(value, maxWidth)

          // Vérifier si on doit passer à une nouvelle page
          if (yPosition + lines.length * lineHeight > 280) {
            doc.addPage()
            yPosition = 20
          }

          doc.text(lines, 20 + labelWidth, yPosition)
          yPosition += lines.length * lineHeight
        } else {
          // Vérifier si on doit passer à une nouvelle page
          if (yPosition > 280) {
            doc.addPage()
            yPosition = 20
          }

          // Texte simple ligne avec limite de largeur
          const textLines = doc.splitTextToSize(value, 125)
          doc.text(textLines, 20 + labelWidth, yPosition)
          yPosition += textLines.length * lineHeight
        }

        // Espacement entre les lignes
        yPosition += 5
      }

      // Ajouter les informations dans l'ordre spécifié
      addInfoLine("Nom du luminaire", luminaire.name || "")
      addInfoLine("Artiste / Dates", luminaire.artist || "")
      addInfoLine("Spécialité", luminaire.specialty || "")
      addInfoLine("Collaboration / Œuvre", luminaire.collaboration || "", true)
      addInfoLine("Description", luminaire.description || "", true)
      addInfoLine("Année", luminaire.year || "")
      addInfoLine("Dimensions", luminaire.dimensions || "")
      addInfoLine("Matériaux", luminaire.materials || "", true)
      addInfoLine("Signé", luminaire.signed || "")
      addInfoLine("Estimation", luminaire.estimation || "")
      addInfoLine("Lien internet", luminaire.url || "")

      // Pied de page
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont("helvetica", "italic")
        doc.text(`Document généré le ${new Date().toLocaleDateString("fr-FR")}`, 105, 290, { align: "center" })

        // Numéro de page si plusieurs pages
        if (pageCount > 1) {
          doc.text(`Page ${i}/${pageCount}`, 190, 290, { align: "right" })
        }
      }

      // Télécharger le PDF
      const fileName = `${luminaire.name || "luminaire"}_${new Date().toISOString().split("T")[0]}.pdf`
      doc.save(fileName)
      console.log("PDF généré et téléchargé:", fileName)
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error)
      alert("Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.")
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (!luminaire) {
    return (
      <div className="container-responsive py-8">
        <div className="text-center">
          <p className="text-lg text-gray-600">Luminaire non trouvé</p>
          <Link href="/luminaires">
            <Button className="mt-4">Retour à la galerie</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/luminaires">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour à la galerie
            </Button>
          </Link>

          <div className="flex items-center gap-4">
            {/* Seuls les utilisateurs admin et premium peuvent générer des PDF */}
            {(userData?.role === "admin" || userData?.role === "premium") && (
              <Button
                onClick={generatePDF}
                className="bg-orange hover:bg-orange/90 text-white"
                disabled={generatingPDF}
              >
                <Download className="w-4 h-4 mr-2" />
                {generatingPDF ? "Génération..." : "Télécharger PDF"}
              </Button>
            )}
            <FavoriteToggleButton isActive={isFavorite} onClick={toggleFavorite} />
          </div>
        </div>

        {/* Message pour les utilisateurs non-admin */}
        {!canEdit && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="flex items-center">
              <span className="mr-2">ℹ️</span>
              <span>
                Mode lecture seule. Seuls les administrateurs peuvent modifier les informations.
                {userData?.role === "free" && (
                  <Link href="#" className="ml-1 underline font-medium">
                    Passez à Premium
                  </Link>
                )}
              </span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Image */}
          <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
            <Image
              src={luminaire.image || "/placeholder.svg?height=600&width=600"}
              alt={luminaire.name || "Luminaire"}
              fill
              className="object-cover"
            />
          </div>

          {/* Détails - Limités à la hauteur de l'image */}
          <div className="aspect-square overflow-y-auto pr-2">
            <div className="space-y-4 font-serif">
              {/* Nom du luminaire */}
              <div>
                {canEdit ? (
                  <EditableField
                    value={luminaire.name || ""}
                    onSave={(value) => handleUpdate("name", value)}
                    className="text-2xl font-playfair text-dark"
                    placeholder="Nom du luminaire"
                  />
                ) : (
                  <h1 className="text-2xl font-playfair text-dark">
                    {luminaire.name || "Nom du luminaire non renseigné"}
                  </h1>
                )}
              </div>

              {/* Ordre spécifique demandé */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Artiste / Dates</label>
                  {canEdit ? (
                    <EditableField
                      value={luminaire.artist || ""}
                      onSave={(value) => handleUpdate("artist", value)}
                      placeholder="Nom de l'artiste"
                    />
                  ) : (
                    <p className="text-gray-900">{luminaire.artist || "Non renseigné"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Spécialité</label>
                  {canEdit ? (
                    <EditableField
                      value={luminaire.specialty || ""}
                      onSave={(value) => handleUpdate("specialty", value)}
                      placeholder="Spécialité"
                    />
                  ) : (
                    <p className="text-gray-900">{luminaire.specialty || "Non renseigné"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Collaboration / Œuvre</label>
                  {canEdit ? (
                    <EditableField
                      value={luminaire.collaboration || ""}
                      onSave={(value) => handleUpdate("collaboration", value)}
                      placeholder="Collaboration ou œuvre"
                      multiline
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-wrap">{luminaire.collaboration || "Non renseigné"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                  {canEdit ? (
                    <EditableField
                      value={luminaire.description || ""}
                      onSave={(value) => handleUpdate("description", value)}
                      placeholder="Description du luminaire"
                      multiline
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-wrap">{luminaire.description || "Non renseigné"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Année</label>
                  {canEdit ? (
                    <EditableField
                      value={luminaire.year || ""}
                      onSave={(value) => handleUpdate("year", value)}
                      placeholder="Année de création"
                    />
                  ) : (
                    <p className="text-gray-900">{luminaire.year || "Non renseigné"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Dimensions</label>
                  {canEdit ? (
                    <EditableField
                      value={luminaire.dimensions || ""}
                      onSave={(value) => handleUpdate("dimensions", value)}
                      placeholder="Dimensions du luminaire"
                    />
                  ) : (
                    <p className="text-gray-900">{luminaire.dimensions || "Non renseigné"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Matériaux</label>
                  {canEdit ? (
                    <EditableField
                      value={luminaire.materials || ""}
                      onSave={(value) => handleUpdate("materials", value)}
                      placeholder="Matériaux utilisés"
                      multiline
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-wrap">{luminaire.materials || "Non renseigné"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Signé</label>
                  {canEdit ? (
                    <EditableField
                      value={luminaire.signed || ""}
                      onSave={(value) => handleUpdate("signed", value)}
                      placeholder="Signature"
                    />
                  ) : (
                    <p className="text-gray-900">{luminaire.signed || "Non renseigné"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Estimation</label>
                  {canEdit ? (
                    <EditableField
                      value={luminaire.estimation || ""}
                      onSave={(value) => handleUpdate("estimation", value)}
                      placeholder="Estimation de prix"
                    />
                  ) : (
                    <p className="text-gray-900">{luminaire.estimation || "Non renseigné"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Lien internet</label>
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <EditableField
                        value={luminaire.url || ""}
                        onSave={(value) => handleUpdate("url", value)}
                        placeholder="https://exemple.com"
                      />
                    ) : (
                      <p className="text-gray-900">{luminaire.url || "Non renseigné"}</p>
                    )}
                    {luminaire.url && (
                      <a
                        href={luminaire.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange hover:text-orange/80"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Luminaires similaires - Sans badges ni explications */}
        {similarLuminaires.length > 0 && (
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-playfair text-dark mb-6">
              Luminaires similaires ({similarLuminaires.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarLuminaires.map((similar: any) => (
                <Link key={similar.id} href={`/luminaires/${similar.id}`}>
                  <div className="bg-gray-50 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer group">
                    <div className="aspect-square relative bg-gray-100">
                      <Image
                        src={similar.image || "/placeholder.svg?height=300&width=300"}
                        alt={similar.name || "Luminaire"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="font-playfair text-lg text-dark group-hover:text-orange transition-colors">
                        {similar.name || "Nom du luminaire"}
                      </h3>

                      <p className="text-gray-600 text-sm">{similar.artist || "Artiste non renseigné"}</p>

                      <p className="text-gray-500 text-xs">{similar.year || "Année inconnue"}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Message si aucun luminaire similaire */}
        {similarLuminaires.length === 0 && (
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <h2 className="text-2xl font-playfair text-dark mb-4">Luminaires similaires</h2>
            <p className="text-gray-500">Aucun luminaire similaire trouvé pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
