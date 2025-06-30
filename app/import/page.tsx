"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Upload, FileText, Users, ImageIcon, Video, Palette, RotateCcw } from "lucide-react"
import { RoleGuard } from "@/components/RoleGuard"
import { CSVExportButton } from "@/components/CSVExportButton"

export default function ImportPage() {
  // États pour CSV Luminaires
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvProgress, setCsvProgress] = useState(0)
  const [csvResults, setCsvResults] = useState<any>(null)

  // États pour CSV Designers
  const [designersCsvFile, setDesignersCsvFile] = useState<File | null>(null)
  const [designersCsvUploading, setDesignersCsvUploading] = useState(false)
  const [designersCsvProgress, setDesignersCsvProgress] = useState(0)
  const [designersCsvResults, setDesignersCsvResults] = useState<any>(null)

  // États pour Images
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageProgress, setImageProgress] = useState(0)
  const [imageResults, setImageResults] = useState<any>(null)

  // États pour Vidéo
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoResults, setVideoResults] = useState<any>(null)

  // États pour Logo
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoProgress, setLogoProgress] = useState(0)
  const [logoResults, setLogoResults] = useState<any>(null)

  // États pour Reset
  const [resetting, setResetting] = useState(false)

  // Refs pour les inputs
  const csvInputRef = useRef<HTMLInputElement>(null)
  const designersCsvInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Upload CSV Luminaires
  const handleCsvUpload = async () => {
    if (!csvFile) return

    setCsvUploading(true)
    setCsvProgress(0)
    setCsvResults(null)

    try {
      const formData = new FormData()
      formData.append("file", csvFile)

      const response = await fetch("/api/upload/csv", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setCsvResults(data)
        toast.success(`✅ ${data.imported} luminaires importés avec succès!`)
      } else {
        toast.error(`❌ Erreur: ${data.error}`)
        setCsvResults({ success: false, error: data.error })
      }
    } catch (error: any) {
      toast.error(`❌ Erreur: ${error.message}`)
      setCsvResults({ success: false, error: error.message })
    } finally {
      setCsvUploading(false)
      setCsvProgress(100)
    }
  }

  // Upload CSV Designers
  const handleDesignersCsvUpload = async () => {
    if (!designersCsvFile) return

    setDesignersCsvUploading(true)
    setDesignersCsvProgress(0)
    setDesignersCsvResults(null)

    try {
      const formData = new FormData()
      formData.append("file", designersCsvFile)

      const response = await fetch("/api/upload/csv-designers", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setDesignersCsvResults(data)
        toast.success(`✅ ${data.imported} designers importés avec succès!`)
      } else {
        toast.error(`❌ Erreur: ${data.error}`)
        setDesignersCsvResults({ success: false, error: data.error })
      }
    } catch (error: any) {
      toast.error(`❌ Erreur: ${error.message}`)
      setDesignersCsvResults({ success: false, error: error.message })
    } finally {
      setDesignersCsvUploading(false)
      setDesignersCsvProgress(100)
    }
  }

  // Upload Images
  const handleImageUpload = async () => {
    if (!imageFiles || imageFiles.length === 0) return

    setImageUploading(true)
    setImageProgress(0)
    setImageResults(null)

    try {
      const formData = new FormData()
      Array.from(imageFiles).forEach((file) => {
        formData.append("images", file)
      })

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setImageResults(data)
        toast.success(`✅ ${data.uploaded} images uploadées avec succès!`)
      } else {
        toast.error(`❌ Erreur: ${data.error}`)
        setImageResults({ success: false, error: data.error })
      }
    } catch (error: any) {
      toast.error(`❌ Erreur: ${error.message}`)
      setImageResults({ success: false, error: error.message })
    } finally {
      setImageUploading(false)
      setImageProgress(100)
    }
  }

  // Upload Vidéo
  const handleVideoUpload = async () => {
    if (!videoFile) return

    setVideoUploading(true)
    setVideoProgress(0)
    setVideoResults(null)

    try {
      const formData = new FormData()
      formData.append("video", videoFile)

      const response = await fetch("/api/upload/video", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setVideoResults(data)
        toast.success("✅ Vidéo uploadée avec succès!")
      } else {
        toast.error(`❌ Erreur: ${data.error}`)
        setVideoResults({ success: false, error: data.error })
      }
    } catch (error: any) {
      toast.error(`❌ Erreur: ${error.message}`)
      setVideoResults({ success: false, error: error.message })
    } finally {
      setVideoUploading(false)
      setVideoProgress(100)
    }
  }

  // Upload Logo
  const handleLogoUpload = async () => {
    if (!logoFile) return

    setLogoUploading(true)
    setLogoProgress(0)
    setLogoResults(null)

    try {
      const formData = new FormData()
      formData.append("logo", logoFile)

      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setLogoResults(data)
        toast.success("✅ Logo uploadé avec succès!")
      } else {
        toast.error(`❌ Erreur: ${data.error}`)
        setLogoResults({ success: false, error: data.error })
      }
    } catch (error: any) {
      toast.error(`❌ Erreur: ${error.message}`)
      setLogoResults({ success: false, error: error.message })
    } finally {
      setLogoUploading(false)
      setLogoProgress(100)
    }
  }

  // Reset Database
  const handleReset = async () => {
    if (
      !confirm("⚠️ Êtes-vous sûr de vouloir réinitialiser toute la base de données ? Cette action est irréversible.")
    ) {
      return
    }

    setResetting(true)

    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("✅ Base de données réinitialisée avec succès!")
        // Réinitialiser tous les états
        setCsvFile(null)
        setCsvResults(null)
        setDesignersCsvFile(null)
        setDesignersCsvResults(null)
        setImageFiles(null)
        setImageResults(null)
        setVideoFile(null)
        setVideoResults(null)
        setLogoFile(null)
        setLogoResults(null)
      } else {
        toast.error(`❌ Erreur: ${data.error}`)
      }
    } catch (error: any) {
      toast.error(`❌ Erreur: ${error.message}`)
    } finally {
      setResetting(false)
    }
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Import de données</h1>
          <p className="text-muted-foreground">
            Importez vos fichiers CSV, images, vidéo et logo pour alimenter la base de données.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* CSV Luminaires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                CSV Luminaires
              </CardTitle>
              <CardDescription>Importer les données des luminaires depuis un fichier CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                onClick={() => csvInputRef.current?.click()}
                variant="outline"
                className="w-full"
                disabled={csvUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {csvFile ? csvFile.name : "Sélectionner CSV"}
              </Button>
              {csvFile && (
                <Button onClick={handleCsvUpload} className="w-full" disabled={csvUploading}>
                  {csvUploading ? "Import en cours..." : "Importer"}
                </Button>
              )}
              {csvUploading && <Progress value={csvProgress} className="w-full" />}
              {csvResults && (
                <div
                  className={`p-3 rounded text-sm ${csvResults.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                >
                  {csvResults.success ? `✅ ${csvResults.imported} luminaires importés` : `❌ ${csvResults.error}`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CSV Designers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                CSV Designers
              </CardTitle>
              <CardDescription>Importer les données des designers depuis un fichier CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={designersCsvInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setDesignersCsvFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                onClick={() => designersCsvInputRef.current?.click()}
                variant="outline"
                className="w-full"
                disabled={designersCsvUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {designersCsvFile ? designersCsvFile.name : "Sélectionner CSV"}
              </Button>
              {designersCsvFile && (
                <Button onClick={handleDesignersCsvUpload} className="w-full" disabled={designersCsvUploading}>
                  {designersCsvUploading ? "Import en cours..." : "Importer"}
                </Button>
              )}
              {designersCsvUploading && <Progress value={designersCsvProgress} className="w-full" />}
              {designersCsvResults && (
                <div
                  className={`p-3 rounded text-sm ${designersCsvResults.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                >
                  {designersCsvResults.success
                    ? `✅ ${designersCsvResults.imported} designers importés`
                    : `❌ ${designersCsvResults.error}`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images
              </CardTitle>
              <CardDescription>Uploader les images des luminaires</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImageFiles(e.target.files)}
                className="hidden"
              />
              <Button
                onClick={() => imageInputRef.current?.click()}
                variant="outline"
                className="w-full"
                disabled={imageUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {imageFiles ? `${imageFiles.length} image(s)` : "Sélectionner images"}
              </Button>
              {imageFiles && imageFiles.length > 0 && (
                <Button onClick={handleImageUpload} className="w-full" disabled={imageUploading}>
                  {imageUploading ? "Upload en cours..." : "Uploader"}
                </Button>
              )}
              {imageUploading && <Progress value={imageProgress} className="w-full" />}
              {imageResults && (
                <div
                  className={`p-3 rounded text-sm ${imageResults.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                >
                  {imageResults.success ? `✅ ${imageResults.uploaded} images uploadées` : `❌ ${imageResults.error}`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vidéo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Vidéo d'accueil
              </CardTitle>
              <CardDescription>Uploader la vidéo de fond pour la page d'accueil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                onClick={() => videoInputRef.current?.click()}
                variant="outline"
                className="w-full"
                disabled={videoUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {videoFile ? videoFile.name : "Sélectionner vidéo"}
              </Button>
              {videoFile && (
                <Button onClick={handleVideoUpload} className="w-full" disabled={videoUploading}>
                  {videoUploading ? "Upload en cours..." : "Uploader"}
                </Button>
              )}
              {videoUploading && <Progress value={videoProgress} className="w-full" />}
              {videoResults && (
                <div
                  className={`p-3 rounded text-sm ${videoResults.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                >
                  {videoResults.success ? "✅ Vidéo uploadée avec succès" : `❌ ${videoResults.error}`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Logo
              </CardTitle>
              <CardDescription>Uploader le logo pour le header</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                onClick={() => logoInputRef.current?.click()}
                variant="outline"
                className="w-full"
                disabled={logoUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {logoFile ? logoFile.name : "Sélectionner logo"}
              </Button>
              {logoFile && (
                <Button onClick={handleLogoUpload} className="w-full" disabled={logoUploading}>
                  {logoUploading ? "Upload en cours..." : "Uploader"}
                </Button>
              )}
              {logoUploading && <Progress value={logoProgress} className="w-full" />}
              {logoResults && (
                <div
                  className={`p-3 rounded text-sm ${logoResults.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                >
                  {logoResults.success ? "✅ Logo uploadé avec succès" : `❌ ${logoResults.error}`}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions globales */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-4">
            <CSVExportButton />
          </div>
          <Button onClick={handleReset} variant="destructive" disabled={resetting} className="flex items-center gap-2">
            {resetting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white"></div>
                Réinitialisation...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Reset Database
              </>
            )}
          </Button>
        </div>
      </div>
    </RoleGuard>
  )
}
