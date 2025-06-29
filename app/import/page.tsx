"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Trash2, Database, Upload, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/useToast"
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

  const { showToast } = useToast()

  const handleCsvUpload = async (data: any[]) => {
    console.log("📥 Début de l'import CSV:", data.length, "lignes")

    if (data.length === 0) {
      showToast("❌ Aucune donnée trouvée dans le fichier CSV", "error")
      return
    }

    setIsUploading(true)

    try {
      // Envoyer directement les données parsées
      const response = await fetch("/api/upload/csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
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
        showToast(`✅ ${result.imported} luminaires importés sur ${result.processed} lignes`, "success")
        if (result.totalErrors > 0) {
          showToast(`⚠️ ${result.totalErrors} erreurs rencontrées`, "error")
        }
      } else {
        throw new Error(result.error || "Erreur lors de l'import")
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import CSV:", error)
      showToast(`❌ Erreur: ${error.message}`, "error")
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
        showToast(`📤 ${result.uploaded} images uploadées, ${result.associated} associées`, "success")
      } else {
        throw new Error(result.error || "Erreur lors de l'upload")
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
      // Envoyer directement les données parsées
      const response = await fetch("/api/upload/csv-designers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
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
        showToast(`✅ ${result.imported} designers importés sur ${result.processed} lignes`, "success")
      } else {
        throw new Error(result.error || "Erreur lors de l'import des designers")
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
      files.forEach((file) => formData.append("images", file))

      const response = await fetch("/api/upload/images", { method: "POST", body: formData })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Upload images designers terminé:", result)
        setDesignerImages((prev) => [...prev, ...files])
        showToast(`✅ ${result.uploaded || files.length} images de designers uploadées`, "success")
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
      formData.append("file", file)
      formData.append("title", "Vidéo d'accueil")
      formData.append("description", "Vidéo de bienvenue de la galerie")

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

  const handleLogoUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("logo", file)

      const response = await fetch("/api/upload/logo", { method: "POST", body: formData })

      if (response.ok) {
        const result = await response.json()
        setLogo(file)
        showToast("✅ Logo uploadé avec succès", "success")
        console.log("🏷️ Logo sauvegardé:", result.filename)
      } else {
        throw new Error("Erreur lors de l'upload du logo")
      }
    } catch (error: any) {
      console.error("❌ Erreur upload logo:", error)
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
          setLogo(null)
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-serif font-bold text-slate-800 mb-4">Import des données</h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Gérez l'importation de vos luminaires, designers, images et médias
              </p>
            </div>

            {/* Indicateur de chargement */}
            {isUploading && (
              <div className="mb-8 p-6 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl shadow-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
                  <span className="text-lg font-medium text-blue-800">Traitement en cours...</span>
                </div>
              </div>
            )}

            {/* Statistiques d'import */}
            {(importStats.luminaires.total > 0 || importStats.designers.total > 0 || importStats.images.total > 0) && (
              <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-3 bg-emerald-500 rounded-full mr-4">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-800 mb-1">Luminaires</p>
                      <p className="text-2xl font-bold text-emerald-900">
                        {importStats.luminaires.success}/{importStats.luminaires.total}
                      </p>
                      {importStats.luminaires.errors > 0 && (
                        <p className="text-xs text-red-600 flex items-center mt-1">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {importStats.luminaires.errors} erreurs
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-500 rounded-full mr-4">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800 mb-1">Images</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {importStats.images.success}/{importStats.images.total}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-100 border border-purple-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-500 rounded-full mr-4">
                      <Database className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-800 mb-1">Designers</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {importStats.designers.success}/{importStats.designers.total}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grille d'import */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Import CSV Luminaires */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mr-4">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-800">Import CSV Luminaires</h2>
                </div>

                <UploadForm accept=".csv" onUpload={handleCsvUpload} type="csv" expectedColumns={[]} />

                {csvData.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-slate-800 font-medium">{csvData.length} lignes CSV traitées</p>
                    <p className="text-xs text-slate-600 mt-1">
                      ✅ {importStats.luminaires.success} réussis • ❌ {importStats.luminaires.errors} erreurs
                    </p>
                  </div>
                )}
              </div>

              {/* Import Images Luminaires */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mr-4">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-800">Import Images Luminaires</h2>
                </div>

                <UploadForm accept="image/*" multiple onUpload={handleImagesUpload} type="images" />

                {images.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-slate-800 font-medium">{images.length} images uploadées</p>
                    <p className="text-xs text-slate-600 mt-1">
                      ✅ {importStats.images.success} associées • ❌ {importStats.images.errors} non associées
                    </p>
                  </div>
                )}
              </div>

              {/* Import CSV Designers */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mr-4">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-800">Import CSV Designers</h2>
                </div>

                <UploadForm accept=".csv" onUpload={handleDesignersUpload} type="csv" expectedColumns={[]} />

                {designers.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <p className="text-sm text-slate-800 font-medium">{designers.length} designers traités</p>
                    <p className="text-xs text-slate-600 mt-1">
                      ✅ {importStats.designers.success} réussis • ❌ {importStats.designers.errors} erreurs
                    </p>
                  </div>
                )}
              </div>

              {/* Import Images Designers */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full mr-4">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-800">Import Images Designers</h2>
                </div>

                <UploadForm accept="image/*" multiple onUpload={handleDesignerImagesUpload} type="images" />

                {designerImages.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <p className="text-sm text-slate-800 font-medium">{designerImages.length} portraits uploadés</p>
                    <p className="text-xs text-slate-600 mt-1">Images associées aux designers</p>
                  </div>
                )}
              </div>

              {/* Import Vidéo */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-red-400 to-pink-500 rounded-full mr-4">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-800">Vidéo d'accueil</h2>
                </div>

                <UploadForm accept="video/mp4" onUpload={handleVideoUpload} type="video" />

                {video && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                    <p className="text-sm text-slate-800 font-medium">Vidéo: {video.name}</p>
                    <p className="text-xs text-slate-600 mt-1">Vidéo sauvegardée et disponible sur la page d'accueil</p>
                  </div>
                )}
              </div>

              {/* Import Logo */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mr-4">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-800">Logo du Header</h2>
                </div>

                <UploadForm accept="image/*" onUpload={handleLogoUpload} type="logo" />

                {logo && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                    <p className="text-sm text-slate-800 font-medium">Logo: {logo.name}</p>
                    <p className="text-xs text-slate-600 mt-1">Logo sauvegardé et disponible dans le header</p>
                  </div>
                )}
              </div>
            </div>

            {/* Zone de danger */}
            <div className="mt-12 text-center">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-red-500 rounded-full mr-4">
                    <Trash2 className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-red-800">Zone de Danger</h3>
                </div>

                <p className="text-red-700 mb-6 max-w-2xl mx-auto">
                  Cette action supprimera définitivement toutes les données de la base MongoDB et tous les fichiers
                  GridFS.
                </p>

                <Button
                  onClick={handleResetDatabase}
                  disabled={isUploading}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Réinitialiser le Serveur
                </Button>

                <p className="text-xs text-red-500 mt-3">⚠️ Action irréversible - Toutes les données seront perdues</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
