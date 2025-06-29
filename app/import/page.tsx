"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Trash2, Database, Upload, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { RoleGuard } from "@/components/RoleGuard"

export default function ImportPage() {
  const [csvData, setCsvData] = useState<any[]>([])
  const [images, setImages] = useState<File[]>([])
  const [designers, setDesigners] = useState<any[]>([])
  const [designerImages, setDesignerImages] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [logo, setLogo] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [importStats, setImportStats] = useState({
    luminaires: { total: 0, success: 0, errors: 0 },
    designers: { total: 0, success: 0, errors: 0 },
    images: { total: 0, success: 0, errors: 0 },
  })

  const handleCsvUpload = async (data: any[]) => {
    console.log("📥 Début de l'import CSV:", data.length, "lignes")

    if (data.length === 0) {
      toast.error("❌ Aucune donnée trouvée dans le fichier CSV")
      return
    }

    setIsUploading(true)

    try {
      // Créer un CSV temporaire avec les données parsées
      const headers = Object.keys(data[0])
      const csvLines = [
        headers.join(";"), // En-têtes
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header] || ""
              // Échapper les guillemets et virgules
              return `"${String(value).replace(/"/g, '""')}"`
            })
            .join(";"),
        ),
      ]

      const csvContent = csvLines.join("\n")
      console.log(`📄 CSV généré: ${csvContent.length} caractères, ${csvLines.length} lignes`)

      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
      const csvFile = new File([csvBlob], "luminaires_import.csv", { type: "text/csv" })

      const formData = new FormData()
      formData.append("file", csvFile)

      console.log(`🚀 Envoi vers l'API /api/upload/csv...`)

      const response = await fetch("/api/upload/csv", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API:", result)

      if (result.success) {
        setCsvData(data)
        setImportStats((prev) => ({
          ...prev,
          luminaires: {
            total: result.processed || data.length,
            success: result.imported || 0,
            errors: result.totalErrors || 0,
          },
        }))

        toast.success(`✅ ${result.imported} luminaires importés sur ${result.processed} lignes`)

        if (result.totalErrors > 0) {
          toast.error(`⚠️ ${result.totalErrors} erreurs rencontrées`)
        }
      } else {
        throw new Error(result.error || "Erreur lors de l'import")
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import CSV:", error)
      toast.error(`❌ Erreur: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true)
    console.log("🖼️ Début de l'upload d'images:", files.length, "fichiers")

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("images", file)
        console.log("📁 Fichier à uploader:", file.name, file.size, "bytes")
      })

      console.log("📤 Envoi des fichiers vers /api/upload/images...")

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("✅ Upload terminé:", result)

      if (result.success) {
        setImages((prev) => [...prev, ...files])
        setImportStats((prev) => ({
          ...prev,
          images: {
            total: files.length,
            success: result.associated || 0,
            errors: files.length - (result.associated || 0),
          },
        }))

        toast.success(`📤 ${result.uploaded} images uploadées, ${result.associated} associées`)
      } else {
        throw new Error(result.error || "Erreur lors de l'upload")
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload d'images:", error)
      toast.error(`❌ Erreur: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDesignersUpload = async (data: any[]) => {
    setIsUploading(true)
    console.log("👨‍🎨 Début de l'import designers:", data.length, "lignes")

    try {
      // Créer un CSV temporaire avec les données parsées
      const headers = Object.keys(data[0])
      const csvLines = [
        headers.join(";"), // En-têtes
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header] || ""
              // Échapper les guillemets et virgules
              return `"${String(value).replace(/"/g, '""')}"`
            })
            .join(";"),
        ),
      ]

      const csvContent = csvLines.join("\n")
      console.log(`📄 CSV designers généré: ${csvContent.length} caractères, ${csvLines.length} lignes`)

      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
      const csvFile = new File([csvBlob], "designers_import.csv", { type: "text/csv" })

      const formData = new FormData()
      formData.append("file", csvFile)

      console.log(`🚀 Envoi vers l'API /api/upload/csv-designers...`)

      const response = await fetch("/api/upload/csv-designers", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API designers:", result)

      if (result.success) {
        setDesigners(data)
        setImportStats((prev) => ({
          ...prev,
          designers: {
            total: result.processed || data.length,
            success: result.imported || 0,
            errors: (result.processed || data.length) - (result.imported || 0),
          },
        }))

        toast.success(`✅ ${result.imported} designers importés sur ${result.processed} lignes`)
      } else {
        throw new Error(result.error || "Erreur lors de l'import des designers")
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import designers:", error)
      toast.error(`❌ Erreur: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDesignerImagesUpload = async (files: File[]) => {
    setIsUploading(true)
    console.log("🖼️ Début de l'upload d'images designers:", files.length, "fichiers")

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("images", file))

      const response = await fetch("/api/upload/images", { method: "POST", body: formData })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Upload images designers terminé:", result)

        setDesignerImages((prev) => [...prev, ...files])
        toast.success(`✅ ${result.uploaded || files.length} images de designers uploadées`)
      } else {
        throw new Error("Erreur lors de l'upload des images de designers")
      }
    } catch (error: any) {
      console.error("❌ Erreur upload images designers:", error)
      toast.error(`❌ Erreur: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleVideoUpload = async (file: File) => {
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", "Vidéo d'accueil")
      formData.append("description", "Vidéo de bienvenue de la galerie")

      const response = await fetch("/api/upload/video", { method: "POST", body: formData })

      if (response.ok) {
        setVideo(file)
        toast.success("✅ Vidéo d'accueil uploadée")
      } else {
        throw new Error("Erreur lors de l'upload de la vidéo")
      }
    } catch (error: any) {
      console.error("❌ Erreur upload vidéo:", error)
      toast.error(`❌ Erreur: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("logo", file)

      const response = await fetch("/api/upload/logo", { method: "POST", body: formData })

      if (response.ok) {
        const result = await response.json()
        setLogo(file)
        toast.success("✅ Logo uploadé avec succès")
        console.log("🏷️ Logo sauvegardé:", result.filename)
      } else {
        throw new Error("Erreur lors de l'upload du logo")
      }
    } catch (error: any) {
      console.error("❌ Erreur upload logo:", error)
      toast.error(`❌ Erreur: ${error.message}`)
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
      toast.info("🗑️ Réinitialisation du serveur en cours...")

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
          setLogo(null)
          setImportStats({
            luminaires: { total: 0, success: 0, errors: 0 },
            designers: { total: 0, success: 0, errors: 0 },
            images: { total: 0, success: 0, errors: 0 },
          })

          console.log("✅ Réinitialisation terminée:", result)
          toast.success("✅ Serveur réinitialisé avec succès !")
        } else {
          throw new Error(result.error || "La réinitialisation a échoué")
        }
      } catch (error: any) {
        console.error("❌ Erreur lors de la réinitialisation:", error)
        toast.error(`❌ Erreur: ${error.message}`)
      } finally {
        setIsUploading(false)
      }
    }
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-serif text-gray-900 mb-8">Import des données</h1>

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
                    {importStats.luminaires.errors > 0 && (
                      <p className="text-xs text-red-600">{importStats.luminaires.errors} erreurs</p>
                    )}
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
              <h2 className="text-2xl font-serif text-gray-900 mb-4">📥 Import CSV Luminaires</h2>
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
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">{csvData.length} lignes CSV traitées</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ✅ {importStats.luminaires.success} réussis • ❌ {importStats.luminaires.errors} erreurs
                  </p>
                </div>
              )}
            </div>

            {/* Import Images Luminaires */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-serif text-gray-900 mb-4">🖼️ Import Images Luminaires</h2>
              <UploadForm accept="image/*" multiple onUpload={handleImagesUpload} type="images" />
              {images.length > 0 && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">{images.length} images uploadées</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ✅ {importStats.images.success} associées • ❌ {importStats.images.errors} non associées
                  </p>
                </div>
              )}
            </div>

            {/* Import CSV Designers */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-serif text-gray-900 mb-4">🧑‍🎨 Import CSV Designers</h2>
              <UploadForm
                accept=".csv"
                onUpload={handleDesignersUpload}
                type="csv"
                expectedColumns={["Nom", "imagedesigner"]}
              />
              {designers.length > 0 && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">{designers.length} designers traités</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ✅ {importStats.designers.success} réussis • ❌ {importStats.designers.errors} erreurs
                  </p>
                </div>
              )}
            </div>

            {/* Import Images Designers */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-serif text-gray-900 mb-4">👤 Import Images Designers</h2>
              <UploadForm accept="image/*" multiple onUpload={handleDesignerImagesUpload} type="images" />
              {designerImages.length > 0 && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">{designerImages.length} portraits uploadés</p>
                  <p className="text-xs text-gray-600 mt-1">Images associées aux designers</p>
                </div>
              )}
            </div>

            {/* Import Vidéo */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-serif text-gray-900 mb-4">🎥 Vidéo d'accueil</h2>
              <UploadForm accept="video/mp4" onUpload={handleVideoUpload} type="video" />
              {video && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">Vidéo: {video.name}</p>
                  <p className="text-xs text-gray-600 mt-1">Vidéo sauvegardée et disponible sur la page d'accueil</p>
                </div>
              )}
            </div>

            {/* Import Logo */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-serif text-gray-900 mb-4">🏷️ Logo du Header</h2>
              <UploadForm accept="image/*" onUpload={handleLogoUpload} type="logo" />
              {logo && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">Logo: {logo.name}</p>
                  <p className="text-xs text-gray-600 mt-1">Logo sauvegardé et disponible dans le header</p>
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
