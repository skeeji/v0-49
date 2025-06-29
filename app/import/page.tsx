"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, Users, ImageIcon, Video, Settings, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import { RoleGuard } from "@/components/RoleGuard"

export default function ImportPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvDesignersFile, setCsvDesignersFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<string>("")
  const [uploadResults, setUploadResults] = useState<any>(null)

  const handleCsvUpload = async () => {
    if (!csvFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus("Début de l'upload CSV...")

    try {
      const formData = new FormData()
      formData.append("csv", csvFile)

      console.log("📊 Début de l'upload CSV:", csvFile.name)

      const response = await fetch("/api/upload/csv", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API CSV:", result)

      if (result.success) {
        setUploadStatus(`✅ CSV uploadé avec succès: ${result.processed} luminaires traités`)
        setUploadResults(result)
      } else {
        setUploadStatus(`❌ Erreur: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload CSV:", error)
      setUploadStatus("❌ Erreur lors de l'upload CSV")
    } finally {
      setIsUploading(false)
      setUploadProgress(100)
    }
  }

  const handleCsvDesignersUpload = async () => {
    if (!csvDesignersFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus("Début de l'upload CSV designers...")

    try {
      const formData = new FormData()
      formData.append("csv", csvDesignersFile)

      console.log("👨‍🎨 Début de l'upload CSV designers:", csvDesignersFile.name)

      const response = await fetch("/api/upload/csv-designers", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API CSV designers:", result)

      if (result.success) {
        setUploadStatus(`✅ CSV designers uploadé avec succès: ${result.processed} designers traités`)
        setUploadResults(result)
      } else {
        setUploadStatus(`❌ Erreur: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload CSV designers:", error)
      setUploadStatus("❌ Erreur lors de l'upload CSV designers")
    } finally {
      setIsUploading(false)
      setUploadProgress(100)
    }
  }

  const handleImagesUpload = async () => {
    if (!imageFiles || imageFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus("Début de l'upload des images...")

    try {
      const formData = new FormData()
      Array.from(imageFiles).forEach((file) => {
        formData.append("images", file)
      })

      console.log("🖼️ Début de l'upload images:", imageFiles.length, "fichiers")

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API images:", result)

      if (result.success) {
        setUploadStatus(`✅ Images uploadées avec succès: ${result.uploaded} images traitées`)
        setUploadResults(result)
      } else {
        setUploadStatus(`❌ Erreur: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload images:", error)
      setUploadStatus("❌ Erreur lors de l'upload des images")
    } finally {
      setIsUploading(false)
      setUploadProgress(100)
    }
  }

  const handleVideoUpload = async () => {
    if (!videoFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus("Début de l'upload vidéo...")

    try {
      const formData = new FormData()
      formData.append("video", videoFile)

      console.log("🎥 Début de l'upload vidéo:", videoFile.name)

      const response = await fetch("/api/upload/video", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API vidéo:", result)

      if (result.success) {
        setUploadStatus(`✅ Vidéo uploadée avec succès: ${result.filename}`)
        setUploadResults(result)
      } else {
        setUploadStatus(`❌ Erreur: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload vidéo:", error)
      setUploadStatus("❌ Erreur lors de l'upload vidéo")
    } finally {
      setIsUploading(false)
      setUploadProgress(100)
    }
  }

  const handleLogoUpload = async () => {
    if (!logoFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus("Début de l'upload logo...")

    try {
      const formData = new FormData()
      formData.append("logo", logoFile)

      console.log("🏷️ Début de l'upload logo:", logoFile.name)

      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API logo:", result)

      if (result.success) {
        setUploadStatus(`✅ Logo uploadé avec succès: ${result.filename}`)
        setUploadResults(result)
      } else {
        setUploadStatus(`❌ Erreur: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload logo:", error)
      setUploadStatus("❌ Erreur lors de l'upload logo")
    } finally {
      setIsUploading(false)
      setUploadProgress(100)
    }
  }

  const handleReset = async () => {
    if (
      !confirm(
        "⚠️ ATTENTION: Cette action va supprimer TOUTES les données (luminaires, designers, images, vidéos). Êtes-vous sûr ?",
      )
    ) {
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus("Suppression en cours...")

    try {
      console.log("🗑️ Début du reset complet")

      const response = await fetch("/api/reset", {
        method: "POST",
      })

      const result = await response.json()
      console.log("📊 Réponse API reset:", result)

      if (result.success) {
        setUploadStatus("✅ Reset terminé avec succès")
        setUploadResults(result)
      } else {
        setUploadStatus(`❌ Erreur: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur reset:", error)
      setUploadStatus("❌ Erreur lors du reset")
    } finally {
      setIsUploading(false)
      setUploadProgress(100)
    }
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif text-gray-900 mb-4">Centre d'Administration</h1>
            <p className="text-gray-600">Gestion des imports et configuration du système</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* CSV Luminaires */}
            <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl text-gray-800">CSV Luminaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">Fichier CSV</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleCsvUpload}
                  disabled={!csvFile || isUploading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importer CSV
                </Button>
              </CardContent>
            </Card>

            {/* CSV Designers */}
            <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl text-gray-800">CSV Designers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="csv-designers-file">Fichier CSV Designers</Label>
                  <Input
                    id="csv-designers-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvDesignersFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleCsvDesignersUpload}
                  disabled={!csvDesignersFile || isUploading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importer Designers
                </Button>
              </CardContent>
            </Card>

            {/* Images */}
            <Card className="border-2 border-green-200 hover:border-green-400 transition-colors">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-xl text-gray-800">Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="images-files">Images (multiple)</Label>
                  <Input
                    id="images-files"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImageFiles(e.target.files)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleImagesUpload}
                  disabled={!imageFiles || isUploading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importer Images
                </Button>
              </CardContent>
            </Card>

            {/* Vidéo */}
            <Card className="border-2 border-orange-200 hover:border-orange-400 transition-colors">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                  <Video className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl text-gray-800">Vidéo de fond</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="video-file">Fichier vidéo</Label>
                  <Input
                    id="video-file"
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleVideoUpload}
                  disabled={!videoFile || isUploading}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importer Vidéo
                </Button>
              </CardContent>
            </Card>

            {/* Logo */}
            <Card className="border-2 border-indigo-200 hover:border-indigo-400 transition-colors">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Settings className="w-8 h-8 text-indigo-600" />
                </div>
                <CardTitle className="text-xl text-gray-800">Logo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="logo-file">Fichier logo</Label>
                  <Input
                    id="logo-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleLogoUpload}
                  disabled={!logoFile || isUploading}
                  variant="destructive"
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importer Logo
                </Button>
              </CardContent>
            </Card>

            {/* Reset */}
            <Card className="border-2 border-red-200 hover:border-red-400 transition-colors">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="text-xl text-gray-800">Reset Complet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 text-center">Supprime toutes les données du système</p>
                <Button
                  onClick={handleReset}
                  disabled={isUploading}
                  variant="destructive"
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset Système
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Status et Progress */}
          {(isUploading || uploadStatus) && (
            <Card className="mt-8">
              <CardContent className="pt-6">
                {isUploading && (
                  <div className="mb-4">
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                {uploadStatus && (
                  <Alert
                    className={
                      uploadStatus.includes("✅")
                        ? "border-green-200 bg-green-50"
                        : uploadStatus.includes("❌")
                          ? "border-red-200 bg-red-50"
                          : "border-blue-200 bg-blue-50"
                    }
                  >
                    <div className="flex items-center">
                      {uploadStatus.includes("✅") ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      ) : uploadStatus.includes("❌") ? (
                        <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                      ) : (
                        <Settings className="w-4 h-4 text-blue-600 mr-2" />
                      )}
                      <AlertDescription className="font-medium">{uploadStatus}</AlertDescription>
                    </div>
                  </Alert>
                )}

                {uploadResults && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Détails de l'opération :</h4>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(uploadResults, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
