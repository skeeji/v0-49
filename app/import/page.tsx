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
  const [isUploading, setIsUploading] = useState(false)
  const { showToast } = useToast()

  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true)
    try {
      // Traiter les données CSV pour les luminaires
      const processedData = data.map((item) => ({
        nom: item["Nom luminaire"] || "",
        designer: item["Artiste / Dates"] || "",
        specialite: item["Spécialité"] || "",
        collaboration: item["Collaboration / Œuvre"] || "",
        annee: Number.parseInt(item["Année"]) || new Date().getFullYear(),
        signe: item["Signé"] || "",
        filename: item["Nom du fichier"] || "",
        dimensions: item["Dimensions"] || "",
        estimation: item["Estimation"] || "",
        materiaux: item["Matériaux"] ? item["Matériaux"].split(",").map((m: string) => m.trim()) : [],
        images: [],
        periode: item["Spécialité"] || "",
        description: `${item["Collaboration / Œuvre"] || ""} ${item["Spécialité"] || ""}`.trim(),
        couleurs: [],
      }))

      // Envoyer chaque luminaire à l'API
      let successCount = 0
      for (const luminaire of processedData) {
        try {
          const response = await fetch("/api/luminaires", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(luminaire),
          })

          if (response.ok) {
            successCount++
          } else {
            console.error("Erreur lors de l'ajout du luminaire:", await response.text())
          }
        } catch (error) {
          console.error("Erreur réseau:", error)
        }
      }

      setCsvData((prev) => [...prev, ...processedData])
      showToast(`${successCount}/${data.length} luminaires importés en base`, "success")
    } catch (error) {
      console.error("Erreur lors de l'import CSV:", error)
      showToast("Erreur lors de l'import CSV", "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()

        // Associer les images aux luminaires par nom de fichier
        for (const uploadedFile of result.uploadedFiles) {
          const fileName = uploadedFile.name.replace(/\.[^/.]+$/, "") // Enlever l'extension

          try {
            // Chercher le luminaire correspondant
            const luminairesResponse = await fetch(`/api/luminaires?search=${encodeURIComponent(fileName)}`)
            if (luminairesResponse.ok) {
              const luminairesData = await luminairesResponse.json()
              const matchingLuminaire = luminairesData.luminaires.find(
                (l: any) =>
                  l.filename === fileName ||
                  l.filename === uploadedFile.name ||
                  l.nom.toLowerCase().includes(fileName.toLowerCase()),
              )

              if (matchingLuminaire) {
                // Mettre à jour le luminaire avec l'image
                const updateResponse = await fetch(`/api/luminaires/${matchingLuminaire._id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...matchingLuminaire,
                    images: [...(matchingLuminaire.images || []), uploadedFile.path],
                  }),
                })

                if (!updateResponse.ok) {
                  console.error("Erreur lors de la mise à jour du luminaire:", await updateResponse.text())
                }
              }
            }
          } catch (error) {
            console.error("Erreur lors de l'association de l'image:", error)
          }
        }

        setImages((prev) => [...prev, ...files])
        showToast(`${result.uploadedFiles.length} images uploadées et associées`, "success")

        if (result.errors.length > 0) {
          console.warn("Erreurs lors de l'upload:", result.errors)
        }
      } else {
        throw new Error("Erreur lors de l'upload des images")
      }
    } catch (error) {
      console.error("Erreur lors de l'upload d'images:", error)
      showToast("Erreur lors de l'upload des images", "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDesignersUpload = async (data: any[]) => {
    setIsUploading(true)
    try {
      const processedDesigners = data.map((item) => ({
        nom: item["Nom"] || "",
        imageFile: item["imagedesigner"] || "",
        slug: (item["Nom"] || "")
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
        biographie: "",
        specialites: [],
        periodes: [],
        images: [],
      }))

      let successCount = 0
      for (const designer of processedDesigners) {
        try {
          const response = await fetch("/api/designers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(designer),
          })

          if (response.ok) {
            successCount++
          } else {
            console.error("Erreur lors de l'ajout du designer:", await response.text())
          }
        } catch (error) {
          console.error("Erreur réseau:", error)
        }
      }

      setDesigners((prev) => [...prev, ...processedDesigners])
      showToast(`${successCount}/${data.length} designers importés en base`, "success")
    } catch (error) {
      console.error("Erreur lors de l'import des designers:", error)
      showToast("Erreur lors de l'import des designers", "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDesignerImagesUpload = async (files: File[]) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()

        // Associer les images aux designers
        for (const uploadedFile of result.uploadedFiles) {
          const fileName = uploadedFile.name.replace(/\.[^/.]+$/, "")

          try {
            const designersResponse = await fetch("/api/designers")
            if (designersResponse.ok) {
              const designersData = await designersResponse.json()
              const matchingDesigner = designersData.designers.find(
                (d: any) =>
                  d.imageFile === fileName ||
                  d.imageFile === uploadedFile.name ||
                  d.nom.toLowerCase().includes(fileName.toLowerCase()),
              )

              if (matchingDesigner) {
                const updateResponse = await fetch(`/api/designers/${matchingDesigner.slug}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...matchingDesigner,
                    images: [...(matchingDesigner.images || []), uploadedFile.path],
                  }),
                })

                if (!updateResponse.ok) {
                  console.error("Erreur lors de la mise à jour du designer:", await updateResponse.text())
                }
              }
            }
          } catch (error) {
            console.error("Erreur lors de l'association de l'image:", error)
          }
        }

        setDesignerImages((prev) => [...prev, ...files])
        showToast(`${result.uploadedFiles.length} images de designers uploadées`, "success")
      } else {
        throw new Error("Erreur lors de l'upload des images de designers")
      }
    } catch (error) {
      console.error("Erreur lors de l'upload d'images de designers:", error)
      showToast("Erreur lors de l'upload des images de designers", "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleVideoUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("video", file)

      const response = await fetch("/api/upload/video", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setVideo(file)
        showToast("Vidéo d'accueil uploadée en base", "success")
      } else {
        throw new Error("Erreur lors de l'upload de la vidéo")
      }
    } catch (error) {
      console.error("Erreur lors de l'upload de la vidéo:", error)
      showToast("Erreur lors de l'upload de la vidéo", "error")
    } finally {
      setIsUploading(false)
    }
  }

  const resetImports = async () => {
    try {
      // Ici on pourrait ajouter une API pour supprimer toutes les données
      // Pour l'instant, on reset juste l'état local
      setCsvData([])
      setImages([])
      setDesigners([])
      setDesignerImages([])
      setVideo(null)
      showToast("État local réinitialisé", "success")
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error)
      showToast("Erreur lors de la réinitialisation", "error")
    }
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="container-responsive py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-playfair text-dark mb-8">Import des données</h1>

          {isUploading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-blue-800">Upload en cours...</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Module 1 - Import CSV Luminaires */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">📥 Import CSV Luminaires</h2>
              <UploadForm
                accept=".csv"
                onUpload={handleCsvUpload}
                type="csv"
                disabled={isUploading}
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
                  <p className="text-sm text-dark">{csvData.length} luminaires traités</p>
                  <p className="text-xs text-gray-600 mt-1">Données sauvegardées en base MongoDB</p>
                </div>
              )}
            </div>

            {/* Module 2 - Import Images Luminaires */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">🖼️ Import Images Luminaires</h2>
              <UploadForm
                accept="image/*"
                multiple
                onUpload={handleImagesUpload}
                type="images"
                disabled={isUploading}
              />
              {images.length > 0 && (
                <div className="mt-4 p-4 bg-cream rounded-lg">
                  <p className="text-sm text-dark">{images.length} images uploadées</p>
                  <div className="mt-2 text-xs text-gray-600">
                    Images sauvegardées et associées automatiquement aux luminaires
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
                disabled={isUploading}
                expectedColumns={["Nom", "imagedesigner"]}
              />
              {designers.length > 0 && (
                <div className="mt-4 p-4 bg-cream rounded-lg">
                  <p className="text-sm text-dark">{designers.length} designers traités</p>
                  <p className="text-xs text-gray-600 mt-1">Données sauvegardées en base MongoDB</p>
                </div>
              )}
            </div>

            {/* Module 3b - Import Images Designers */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">👤 Import Images Designers</h2>
              <UploadForm
                accept="image/*"
                multiple
                onUpload={handleDesignerImagesUpload}
                type="images"
                disabled={isUploading}
              />
              {designerImages.length > 0 && (
                <div className="mt-4 p-4 bg-cream rounded-lg">
                  <p className="text-sm text-dark">{designerImages.length} portraits uploadés</p>
                  <div className="mt-2 text-xs text-gray-600">Images associées aux designers en base</div>
                </div>
              )}
            </div>

            {/* Module 4 - Vidéo d'accueil */}
            <div className="bg-white rounded-xl p-6 shadow-lg lg:col-span-2">
              <h2 className="text-2xl font-playfair text-dark mb-4">🎥 Vidéo d'accueil</h2>
              <UploadForm accept="video/mp4" onUpload={handleVideoUpload} type="video" disabled={isUploading} />
              {video && (
                <div className="mt-4 p-4 bg-cream rounded-lg">
                  <p className="text-sm text-dark">Vidéo: {video.name}</p>
                  <div className="mt-2 text-xs text-gray-600">
                    Vidéo sauvegardée en base et sera affichée sur la page d'accueil
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bouton de réinitialisation */}
          <div className="mt-8 text-center">
            <Button
              onClick={resetImports}
              variant="destructive"
              className="bg-red-500 hover:bg-red-600"
              disabled={isUploading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Réinitialiser l'état local
            </Button>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
