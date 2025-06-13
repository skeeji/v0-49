"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { RoleGuard } from "@/components/RoleGuard"

export default function ImportPage() {
  const [csvData, setCsvData] = useState([])
  const [images, setImages] = useState([])
  const [designers, setDesigners] = useState([])
  const [designerImages, setDesignerImages] = useState([])
  const [video, setVideo] = useState<File | null>(null)
  const { showToast } = useToast()

  const handleCsvUpload = (data: any[]) => {
    // Ajouter des IDs uniques et traiter les données
    const processedData = data.map((item, index) => ({
      id: `luminaire_${Date.now()}_${index}`,
      name: item["Nom luminaire"] || "",
      artist: item["Artiste / Dates"] || "",
      specialty: item["Spécialité"] || "",
      collaboration: item["Collaboration / Œuvre"] || "",
      year: item["Année"] || "",
      signed: item["Signé"] || "",
      image: "",
      filename: item["Nom du fichier"] || "",
      dimensions: item["Dimensions"] || "",
      estimation: item["Estimation"] || "",
      materials: item["Matériaux"] || "",
    }))

    // Sauvegarder dans localStorage (cumul, pas d'écrasement)
    const existingLuminaires = JSON.parse(localStorage.getItem("luminaires") || "[]")
    const updatedLuminaires = [...existingLuminaires, ...processedData]
    localStorage.setItem("luminaires", JSON.stringify(updatedLuminaires))

    setCsvData((prev) => [...prev, ...processedData])
    showToast(`${data.length} luminaires importés`, "success")
  }

  const handleImagesUpload = (files: File[]) => {
    // Associer les images aux luminaires par nom de fichier
    const existingLuminaires = JSON.parse(localStorage.getItem("luminaires") || "[]")

    files.forEach((file) => {
      const fileName = file.name.replace(/\.[^/.]+$/, "") // Enlever l'extension
      const luminaireIndex = existingLuminaires.findIndex(
        (luminaire: any) => luminaire.filename === fileName || luminaire.filename === file.name,
      )

      if (luminaireIndex !== -1) {
        // Créer une URL pour l'image
        const imageUrl = URL.createObjectURL(file)
        existingLuminaires[luminaireIndex].image = imageUrl
      }
    })

    localStorage.setItem("luminaires", JSON.stringify(existingLuminaires))
    setImages((prev) => [...prev, ...files])
    showToast(`${files.length} images importées`, "success")
  }

  const handleDesignersUpload = (data: any[]) => {
    const processedDesigners = data.map((item, index) => ({
      id: `designer_${Date.now()}_${index}`,
      name: item["Nom"] || "",
      imageFile: item["imagedesigner"] || "",
      image: "",
    }))

    const existingDesigners = JSON.parse(localStorage.getItem("designers") || "[]")
    const updatedDesigners = [...existingDesigners, ...processedDesigners]
    localStorage.setItem("designers", JSON.stringify(updatedDesigners))

    setDesigners((prev) => [...prev, ...processedDesigners])
    showToast(`${data.length} designers importés`, "success")
  }

  const handleDesignerImagesUpload = (files: File[]) => {
    const existingDesigners = JSON.parse(localStorage.getItem("designers") || "[]")

    files.forEach((file) => {
      const fileName = file.name.replace(/\.[^/.]+$/, "")
      const designerIndex = existingDesigners.findIndex(
        (designer: any) => designer.imageFile === fileName || designer.imageFile === file.name,
      )

      if (designerIndex !== -1) {
        const imageUrl = URL.createObjectURL(file)
        existingDesigners[designerIndex].image = imageUrl
      }
    })

    localStorage.setItem("designers", JSON.stringify(existingDesigners))
    setDesignerImages((prev) => [...prev, ...files])
    showToast(`${files.length} images de designers importées`, "success")
  }

  const handleVideoUpload = (file: File) => {
    const videoUrl = URL.createObjectURL(file)
    localStorage.setItem("welcomeVideo", videoUrl)
    setVideo(file)
    showToast("Vidéo d'accueil mise à jour", "success")
  }

  const resetImports = () => {
    setCsvData([])
    setImages([])
    setDesigners([])
    setDesignerImages([])
    setVideo(null)
    localStorage.removeItem("luminaires")
    localStorage.removeItem("designers")
    localStorage.removeItem("welcomeVideo")
    showToast("Imports réinitialisés", "success")
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="container-responsive py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-playfair text-dark mb-8">Import des données</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Module 1 - Import CSV Luminaires */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">📥 Import CSV Luminaires</h2>
              <UploadForm
                accept=".csv"
                onUpload={handleCsvUpload}
                type="csv"
                expectedColumns={[
                  "Artiste / Dates",
                  "Spécialité",
                  "Collaboration / Œuvre",
                  "Nom luminaire",
                  "Année",
                  "Signé",
                  "Image",
                  "Nom du fichier",
                  "Dimensions",
                  "Estimation",
                  "Matériaux",
                ]}
              />
              {csvData.length > 0 && (
                <div className="mt-4 p-4 bg-cream rounded-lg">
                  <p className="text-sm text-dark">{csvData.length} luminaires importés</p>
                </div>
              )}
            </div>

            {/* Module 2 - Import Images Luminaires */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">🖼️ Import Images Luminaires</h2>
              <UploadForm accept="image/*" multiple onUpload={handleImagesUpload} type="images" />
              {images.length > 0 && (
                <div className="mt-4 p-4 bg-cream rounded-lg">
                  <p className="text-sm text-dark">{images.length} images importées</p>
                  <div className="mt-2 text-xs text-gray-600">
                    Correspondance automatique avec le champ "Nom du fichier"
                  </div>
                </div>
              )}
            </div>

            {/* Module 3 - Import CSV Designers */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">🧑‍🎨 Import CSV Designers</h2>
              <UploadForm
                accept=".csv"
                onUpload={handleDesignersUpload}
                type="csv"
                expectedColumns={["Nom", "imagedesigner"]}
              />
              {designers.length > 0 && (
                <div className="mt-4 p-4 bg-cream rounded-lg">
                  <p className="text-sm text-dark">{designers.length} designers importés</p>
                </div>
              )}
            </div>

            {/* Module 3b - Import Images Designers */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">👤 Import Images Designers</h2>
              <UploadForm accept="image/*" multiple onUpload={handleDesignerImagesUpload} type="images" />
              {designerImages.length > 0 && (
                <div className="mt-4 p-4 bg-cream rounded-lg">
                  <p className="text-sm text-dark">{designerImages.length} portraits importés</p>
                  <div className="mt-2 text-xs text-gray-600">Correspondance avec le champ "imagedesigner"</div>
                </div>
              )}
            </div>

            {/* Module 4 - Vidéo d'accueil */}
            <div className="bg-white rounded-xl p-6 shadow-lg lg:col-span-2">
              <h2 className="text-2xl font-playfair text-dark mb-4">🎥 Vidéo d'accueil</h2>
              <UploadForm accept="video/mp4" onUpload={handleVideoUpload} type="video" />
              {video && (
                <div className="mt-4 p-4 bg-cream rounded-lg">
                  <p className="text-sm text-dark">Vidéo: {video.name}</p>
                  <div className="mt-2 text-xs text-gray-600">
                    Sera affichée en plein écran sur la page d'accueil avec overlay orangé
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bouton de réinitialisation */}
          <div className="mt-8 text-center">
            <Button onClick={resetImports} variant="destructive" className="bg-red-500 hover:bg-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Réinitialiser les imports
            </Button>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
