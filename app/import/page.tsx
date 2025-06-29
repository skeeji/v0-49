"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Trash2, Database, Upload, CheckCircle, AlertCircle, FileText, ImageIcon, Video, Palette } from "lucide-react"
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
          toast.warning(`⚠️ ${result.totalErrors} erreurs rencontrées`)
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-serif text-slate-900 mb-4 tracking-tight">Centre d'Administration</h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Gérez l'importation des données, images et contenus de votre galerie de luminaires
              </p>
            </div>

            {/* Indicateur de chargement */}
            {isUploading && (
              <div className="mb-8 p-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600 mr-3"></div>
                  <span className="text-slate-700 font-medium">Traitement en cours...</span>
                </div>
              </div>
            )}

            {/* Statistiques d'import */}
            {(importStats.luminaires.total > 0 || importStats.designers.total > 0 || importStats.images.total > 0) && (
              <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-3 bg-emerald-500 rounded-xl mr-4">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">Luminaires</p>
                      <p className="text-2xl font-bold text-emerald-900">
                        {importStats.luminaires.success}/{importStats.luminaires.total}
                      </p>
                      {importStats.luminaires.errors > 0 && (
                        <p className="text-sm text-red-600 flex items-center mt-1">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {importStats.luminaires.errors} erreurs
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-500 rounded-xl mr-4">
                      <ImageIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Images</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {importStats.images.success}/{importStats.images.total}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-500 rounded-xl mr-4">
                      <Palette className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-purple-800 uppercase tracking-wide">Designers</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {importStats.designers.success}/{importStats.designers.total}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Import CSV Luminaires */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl mr-4">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif text-slate-900">Import CSV Luminaires</h2>
                </div>
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
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-900 font-semibold">{csvData.length} lignes CSV traitées</p>
                    <p className="text-xs text-slate-600 mt-1">
                      ✅ {importStats.luminaires.success} réussis • ❌ {importStats.luminaires.errors} erreurs
                    </p>
                  </div>
                )}
              </div>

              {/* Import Images Luminaires */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl mr-4">
                    <ImageIcon className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif text-slate-900">Images Luminaires</h2>
                </div>
                <UploadForm accept="image/*" multiple onUpload={handleImagesUpload} type="images" />
                {images.length > 0 && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-900 font-semibold">{images.length} images uploadées</p>
                    <p className="text-xs text-slate-600 mt-1">
                      ✅ {importStats.images.success} associées • ❌ {importStats.images.errors} non associées
                    </p>
                  </div>
                )}
              </div>

              {/* Import CSV Designers */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl mr-4">
                    <Palette className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif text-slate-900">Import CSV Designers</h2>
                </div>
                <UploadForm
                  accept=".csv"
                  onUpload={handleDesignersUpload}
                  type="csv"
                  expectedColumns={["Nom", "imagedesigner"]}
                />
                {designers.length > 0 && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-900 font-semibold">{designers.length} designers traités</p>
                    <p className="text-xs text-slate-600 mt-1">
                      ✅ {importStats.designers.success} réussis • ❌ {importStats.designers.errors} erreurs
                    </p>
                  </div>
                )}
              </div>

              {/* Import Images Designers */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl mr-4">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif text-slate-900">Images Designers</h2>
                </div>
                <UploadForm accept="image/*" multiple onUpload={handleDesignerImagesUpload} type="images" />
                {designerImages.length > 0 && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-900 font-semibold">{designerImages.length} portraits uploadés</p>
                    <p className="text-xs text-slate-600 mt-1">Images associées aux designers</p>
                  </div>
                )}
              </div>

              {/* Import Vidéo */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl mr-4">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif text-slate-900">Vidéo d'accueil</h2>
                </div>
                <UploadForm accept="video/mp4" onUpload={handleVideoUpload} type="video" />
                {video && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-900 font-semibold">Vidéo: {video.name}</p>
                    <p className="text-xs text-slate-600 mt-1">Vidéo sauvegardée et disponible sur la page d'accueil</p>
                  </div>
                )}
              </div>

              {/* Import Logo */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl mr-4">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif text-slate-900">Logo du Header</h2>
                </div>
                <UploadForm accept="image/*" onUpload={handleLogoUpload} type="logo" />
                {logo && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-900 font-semibold">Logo: {logo.name}</p>
                    <p className="text-xs text-slate-600 mt-1">Logo sauvegardé et disponible dans le header</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bouton de réinitialisation */}
            <div className="mt-12 text-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-red-200">
                <div className="mb-6">
                  <h3 className="text-2xl font-serif text-slate-900 mb-2">Zone de Danger</h3>
                  <p className="text-slate-600">Cette action supprimera définitivement toutes les données de la base</p>
                </div>
                <Button
                  onClick={handleResetDatabase}
                  variant="destructive"
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isUploading}
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Réinitialiser le Serveur
                </Button>
                <p className="text-xs text-slate-500 mt-3">⚠️ Supprime TOUTES les données MongoDB et GridFS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
