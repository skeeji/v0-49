"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Trash2, Database, Upload, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { RoleGuard } from "@/components/RoleGuard"

export default function ImportPage() {
  const [csvData, setCsvData] = useState<any[]>([])
  const [images, setImages] = useState<File[]>([])
  const [designers, setDesigners] = useState<any[]>([])
  const [designerImages, setDesignerImages] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [importStats, setImportStats] = useState({
    luminaires: { total: 0, success: 0, errors: 0 },
    designers: { total: 0, success: 0, errors: 0 },
    images: { total: 0, success: 0, errors: 0 },
  })
  const { showToast } = useToast()

  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true)
    console.log("📥 Début de l'import CSV:", data.length, "lignes")

    try {
      const processedData = data.map((item, index) => {
        const filename = item["Nom du fichier"] || ""
        const nomLuminaire = item["Nom luminaire"] || ""
        const finalNom = nomLuminaire || filename.replace(/\.[^/.]+$/, "")

        console.log(`📋 Ligne ${index + 1}:`, {
          nom: finalNom,
          designer: item["Artiste / Dates"],
          annee: item["Année"],
          filename: filename,
        })

        return {
          nom: finalNom,
          designer: item["Artiste / Dates"] || "",
          specialite: item["Spécialité"] || "",
          collaboration: item["Collaboration / Œuvre"] || "",
          annee: Number.parseInt(item["Année"]) || new Date().getFullYear(),
          signe: item["Signé"] || "",
          filename: filename,
          dimensions: item["Dimensions"] || "",
          estimation: item["Estimation"] || "",
          materiaux: item["Matériaux"] ? item["Matériaux"].split(",").map((m: string) => m.trim()) : [],
          images: [],
          periode: item["Spécialité"] || "",
          description: `${item["Collaboration / Œuvre"] || ""} ${item["Spécialité"] || ""}`.trim(),
          couleurs: [],
        }
      })

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      console.log(`🚀 Envoi de ${processedData.length} luminaires vers l'API...`)

      for (let i = 0; i < processedData.length; i++) {
        const luminaire = processedData[i]

        if (!luminaire.filename && !luminaire.nom) {
          console.warn(`⚠️ Ligne ${i + 1} ignorée: nom et filename manquants`)
          errorCount++
          errors.push(`Ligne ${i + 1}: nom et filename manquants`)
          continue
        }

        try {
          console.log(`📤 Envoi luminaire ${i + 1}/${processedData.length}:`, luminaire.nom)

          const response = await fetch("/api/luminaires", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(luminaire),
          })

          const result = await response.json()

          if (response.ok && result.success) {
            successCount++
            console.log(`✅ Luminaire ${i + 1} créé avec succès:`, result.id)
          } else {
            errorCount++
            const errorMsg = result.details || result.error || "Erreur inconnue"
            errors.push(`Ligne ${i + 1} (${luminaire.nom}): ${errorMsg}`)
            console.error(`❌ Erreur luminaire ${i + 1}:`, errorMsg)
          }
        } catch (error: any) {
          errorCount++
          errors.push(`Ligne ${i + 1} (${luminaire.nom}): ${error.message}`)
          console.error(`❌ Erreur réseau luminaire ${i + 1}:`, error.message)
        }
      }

      setCsvData(processedData)
      setImportStats((prev) => ({
        ...prev,
        luminaires: { total: processedData.length, success: successCount, errors: errorCount },
      }))

      if (successCount > 0) {
        showToast(`✅ ${successCount}/${processedData.length} luminaires importés avec succès`, "success")
      }
      if (errorCount > 0) {
        showToast(`⚠️ ${errorCount} erreurs lors de l'import`, "error")
        console.error("Erreurs détaillées:", errors)
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import CSV:", error)
      showToast(`❌ Erreur critique: ${error.message}`, "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true)
    console.log("🖼️ Début de l'upload d'images:", files.length, "fichiers")

    try {
      // 1. Upload des fichiers vers GridFS
      const uploadFormData = new FormData()
      files.forEach((file) => {
        uploadFormData.append("files", file)
        console.log("📁 Fichier à uploader:", file.name, file.size, "bytes")
      })

      console.log("📤 Envoi des fichiers vers /api/upload/images...")
      const uploadResponse = await fetch("/api/upload/images", {
        method: "POST",
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }

      const uploadResult = await uploadResponse.json()
      console.log("✅ Upload terminé:", uploadResult)

      if (!uploadResult.uploadedFiles || uploadResult.uploadedFiles.length === 0) {
        throw new Error("Aucun fichier uploadé")
      }

      showToast(`📤 ${uploadResult.uploadedFiles.length} images uploadées. Association en cours...`, "info")

      // 2. Récupérer tous les luminaires pour l'association
      console.log("🔍 Récupération des luminaires pour association...")
      const luminairesResponse = await fetch("/api/luminaires?limit=1000")
      const luminairesData = await luminairesResponse.json()

      if (!luminairesData.success) {
        throw new Error("Impossible de récupérer les luminaires")
      }

      const allLuminaires = luminairesData.luminaires
      console.log(`📋 ${allLuminaires.length} luminaires trouvés pour association`)

      // 3. Associer chaque image uploadée à un luminaire
      let successCount = 0
      let errorCount = 0

      for (const uploadedFile of uploadResult.uploadedFiles) {
        const fileNameWithoutExt = uploadedFile.name.replace(/\.[^/.]+$/, "")
        console.log(`🔗 Association de l'image: ${uploadedFile.name} -> ${fileNameWithoutExt}`)

        // Chercher le luminaire correspondant
        const matchingLuminaire = allLuminaires.find(
          (l: any) =>
            l.filename === uploadedFile.name ||
            l.filename === fileNameWithoutExt ||
            l.nom.toLowerCase().includes(fileNameWithoutExt.toLowerCase()),
        )

        if (matchingLuminaire) {
          try {
            console.log(`✅ Luminaire trouvé: ${matchingLuminaire.nom} (ID: ${matchingLuminaire._id})`)

            const updatedImages = [...(matchingLuminaire.images || []), uploadedFile.path]

            const updateResponse = await fetch(`/api/luminaires/${matchingLuminaire._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images: updatedImages }),
            })

            if (updateResponse.ok) {
              successCount++
              console.log(`✅ Image associée: ${uploadedFile.name} -> ${matchingLuminaire.nom}`)
            } else {
              errorCount++
              const errorText = await updateResponse.text()
              console.error(`❌ Échec association ${uploadedFile.name}:`, errorText)
            }
          } catch (e: any) {
            errorCount++
            console.error(`❌ Erreur association ${uploadedFile.name}:`, e.message)
          }
        } else {
          errorCount++
          console.warn(`⚠️ Aucun luminaire trouvé pour: ${uploadedFile.name}`)
        }
      }

      setImages((prev) => [...prev, ...files])
      setImportStats((prev) => ({
        ...prev,
        images: { total: uploadResult.uploadedFiles.length, success: successCount, errors: errorCount },
      }))

      if (successCount > 0) {
        showToast(`✅ ${successCount} images associées avec succès`, "success")
      }
      if (errorCount > 0) {
        showToast(`⚠️ ${errorCount} images non associées`, "error")
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload d'images:", error)
      showToast(`❌ Erreur: ${error.message}`, "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDesignersUpload = async (data: any[]) => {
    setIsUploading(true)
    console.log("👨‍🎨 Début de l'import designers:", data.length, "lignes")

    try {
      const processedDesigners = data.map((item, index) => {
        const designer = {
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
        }

        console.log(`👤 Designer ${index + 1}:`, designer)
        return designer
      })

      let successCount = 0
      let errorCount = 0

      for (const designer of processedDesigners) {
        try {
          console.log(`📤 Envoi designer: ${designer.nom}`)

          const response = await fetch("/api/designers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(designer),
          })

          const result = await response.json()

          if (response.ok && result.success) {
            successCount++
            console.log(`✅ Designer créé: ${designer.nom}`)
          } else {
            errorCount++
            console.error(`❌ Erreur designer ${designer.nom}:`, result.error)
          }
        } catch (error: any) {
          errorCount++
          console.error(`❌ Erreur réseau designer ${designer.nom}:`, error.message)
        }
      }

      setDesigners((prev) => [...prev, ...processedDesigners])
      setImportStats((prev) => ({
        ...prev,
        designers: { total: processedDesigners.length, success: successCount, errors: errorCount },
      }))

      if (successCount > 0) {
        showToast(`✅ ${successCount}/${processedDesigners.length} designers importés`, "success")
      }
      if (errorCount > 0) {
        showToast(`⚠️ ${errorCount} erreurs lors de l'import designers`, "error")
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import designers:", error)
      showToast(`❌ Erreur: ${error.message}`, "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDesignerImagesUpload = async (files: File[]) => {
    setIsUploading(true)
    console.log("🖼️ Début de l'upload d'images designers:", files.length, "fichiers")

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))

      const response = await fetch("/api/upload/images", { method: "POST", body: formData })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Upload images designers terminé:", result)

        // Association avec les designers
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

                if (updateResponse.ok) {
                  console.log(`✅ Image designer associée: ${uploadedFile.name} -> ${matchingDesigner.nom}`)
                } else {
                  console.error(`❌ Erreur association image designer: ${uploadedFile.name}`)
                }
              }
            }
          } catch (error) {
            console.error("❌ Erreur lors de l'association de l'image designer:", error)
          }
        }

        setDesignerImages((prev) => [...prev, ...files])
        showToast(`✅ ${result.uploadedFiles.length} images de designers uploadées`, "success")
      } else {
        throw new Error("Erreur lors de l'upload des images de designers")
      }
    } catch (error: any) {
      console.error("❌ Erreur upload images designers:", error)
      showToast(`❌ Erreur: ${error.message}`, "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleVideoUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("video", file)
      const response = await fetch("/api/upload/video", { method: "POST", body: formData })
      if (response.ok) {
        setVideo(file)
        showToast("✅ Vidéo d'accueil uploadée", "success")
      } else {
        throw new Error("Erreur lors de l'upload de la vidéo")
      }
    } catch (error: any) {
      console.error("❌ Erreur upload vidéo:", error)
      showToast(`❌ Erreur: ${error.message}`, "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleResetDatabase = async () => {
    const isConfirmed = window.confirm(
      "⚠️ ATTENTION: Cette action va supprimer TOUTES les données et TOUS les fichiers du serveur MongoDB et GridFS. Cette action est IRRÉVERSIBLE.\n\nÊtes-vous absolument certain de vouloir continuer ?",
    )

    if (isConfirmed) {
      setIsUploading(true)
      showToast("🗑️ Réinitialisation du serveur en cours...", "info")

      try {
        console.log("🗑️ Début de la réinitialisation complète...")

        const response = await fetch("/api/reset", { method: "DELETE" })
        const result = await response.json()

        if (response.ok && result.success) {
          // Réinitialiser l'état local
          setCsvData([])
          setImages([])
          setDesigners([])
          setDesignerImages([])
          setVideo(null)
          setImportStats({
            luminaires: { total: 0, success: 0, errors: 0 },
            designers: { total: 0, success: 0, errors: 0 },
            images: { total: 0, success: 0, errors: 0 },
          })

          console.log("✅ Réinitialisation terminée:", result)
          showToast("✅ Serveur réinitialisé avec succès !", "success")
        } else {
          throw new Error(result.error || "La réinitialisation a échoué")
        }
      } catch (error: any) {
        console.error("❌ Erreur lors de la réinitialisation:", error)
        showToast(`❌ Erreur: ${error.message}`, "error")
      } finally {
        setIsUploading(false)
      }
    }
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="container-responsive py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-playfair text-dark mb-8">Import des données</h1>

          {/* Indicateur de chargement */}
          {isUploading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-blue-800">Traitement en cours...</span>
              </div>
            </div>
          )}

          {/* Statistiques d'import */}
          {(importStats.luminaires.total > 0 || importStats.designers.total > 0 || importStats.images.total > 0) && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Luminaires</p>
                    <p className="text-lg font-bold text-green-900">
                      {importStats.luminaires.success}/{importStats.luminaires.total}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Upload className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Images</p>
                    <p className="text-lg font-bold text-blue-900">
                      {importStats.images.success}/{importStats.images.total}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-purple-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">Designers</p>
                    <p className="text-lg font-bold text-purple-900">
                      {importStats.designers.success}/{importStats.designers.total}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Import CSV Luminaires */}
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
                  <p className="text-sm text-dark font-medium">{csvData.length} luminaires traités</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ✅ {importStats.luminaires.success} réussis • ❌ {importStats.luminaires.errors} erreurs
                  </p>
                </div>
              )}
            </div>

            {/* Import Images Luminaires */}
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
                  <p className="text-sm text-dark font-medium">{images.length} images uploadées</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ✅ {importStats.images.success} associées • ❌ {importStats.images.errors} non associées
                  </p>
                </div>
              )}
            </div>

            {/* Import CSV Designers */}
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
                  <p className="text-sm text-dark font-medium">{designers.length} designers traités</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ✅ {importStats.designers.success} réussis • ❌ {importStats.designers.errors} erreurs
                  </p>
                </div>
              )}
            </div>

            {/* Import Images Designers */}
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
                  <p className="text-sm text-dark font-medium">{designerImages.length} portraits uploadés</p>
                  <p className="text-xs text-gray-600 mt-1">Images associées aux designers</p>
                </div>
              )}
            </div>

            {/* Import Vidéo */}
            <div className="bg-white rounded-xl p-6 shadow-lg lg:col-span-2">
              <h2 className="text-2xl font-playfair text-dark mb-4">🎥 Vidéo d'accueil</h2>
              <UploadForm accept="video/mp4" onUpload={handleVideoUpload} type="video" disabled={isUploading} />
              {video && (
                <div className="mt-4 p-4 bg-cream rounded-lg">
                  <p className="text-sm text-dark font-medium">Vidéo: {video.name}</p>
                  <p className="text-xs text-gray-600 mt-1">Vidéo sauvegardée et disponible sur la page d'accueil</p>
                </div>
              )}
            </div>
          </div>

          {/* Bouton de réinitialisation */}
          <div className="mt-8 text-center">
            <Button
              onClick={handleResetDatabase}
              variant="destructive"
              className="bg-red-500 hover:bg-red-600"
              disabled={isUploading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Réinitialiser le Serveur (DANGER)
            </Button>
            <p className="text-xs text-gray-500 mt-2">⚠️ Supprime TOUTES les données MongoDB et GridFS</p>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
