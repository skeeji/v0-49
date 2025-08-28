"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Download, FileText, ImageIcon, Users, Video, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { RoleGuard } from "@/components/RoleGuard"
import { toast } from "sonner"

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
  const [csvData, setCsvData] = useState<any[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const periodImagesInputRef = useRef<HTMLInputElement>(null)
  const designersFileInputRef = useRef<HTMLInputElement>(null)

  const { userData } = useAuth()

  // Upload CSV des luminaires
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress("Préparation du fichier...")

    const formData = new FormData()
    formData.append("file", file)

    try {
      setUploadProgress("Upload en cours...")
      const response = await fetch("/api/upload/csv", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadProgress(`✅ Succès: ${result.message}`)
        toast.success(`CSV importé avec succès: ${result.message}`)
      } else {
        setUploadProgress(`❌ Erreur: ${result.error}`)
        toast.error(`Erreur d'import: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload CSV:", error)
      setUploadProgress("❌ Erreur lors de l'upload")
      toast.error("Erreur lors de l'upload du CSV")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Upload CSV des designers
  const handleDesignersCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress("Préparation du fichier designers...")

    const formData = new FormData()
    formData.append("file", file)

    try {
      setUploadProgress("Upload des designers en cours...")
      const response = await fetch("/api/upload/csv-designers", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadProgress(`✅ Succès designers: ${result.message}`)
        toast.success(`CSV designers importé avec succès: ${result.message}`)
      } else {
        setUploadProgress(`❌ Erreur designers: ${result.error}`)
        toast.error(`Erreur d'import designers: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload CSV designers:", error)
      setUploadProgress("❌ Erreur lors de l'upload des designers")
      toast.error("Erreur lors de l'upload du CSV designers")
    } finally {
      setIsUploading(false)
      if (designersFileInputRef.current) {
        designersFileInputRef.current.value = ""
      }
    }
  }

  // Upload images multiples
  const handleImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(`Préparation de ${files.length} images...`)

    const formData = new FormData()
    Array.from(files).forEach((file) => {
      formData.append("images", file)
    })

    try {
      setUploadProgress(`Upload de ${files.length} images en cours...`)
      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadProgress(`✅ Succès: ${result.uploaded} images uploadées`)
        toast.success(`${result.uploaded} images uploadées avec succès`)
      } else {
        setUploadProgress(`❌ Erreur: ${result.error}`)
        toast.error(`Erreur d'upload: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload images:", error)
      setUploadProgress("❌ Erreur lors de l'upload des images")
      toast.error("Erreur lors de l'upload des images")
    } finally {
      setIsUploading(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ""
      }
    }
  }

  // Upload vidéo
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress("Préparation de la vidéo...")

    const formData = new FormData()
    formData.append("video", file)

    try {
      setUploadProgress("Upload de la vidéo en cours...")
      const response = await fetch("/api/upload/video", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadProgress(`✅ Succès: Vidéo uploadée`)
        toast.success("Vidéo uploadée avec succès")
      } else {
        setUploadProgress(`❌ Erreur: ${result.error}`)
        toast.error(`Erreur d'upload: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload vidéo:", error)
      setUploadProgress("❌ Erreur lors de l'upload de la vidéo")
      toast.error("Erreur lors de l'upload de la vidéo")
    } finally {
      setIsUploading(false)
      if (videoInputRef.current) {
        videoInputRef.current.value = ""
      }
    }
  }

  // Upload logo
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress("Préparation du logo...")

    const formData = new FormData()
    formData.append("logo", file)

    try {
      setUploadProgress("Upload du logo en cours...")
      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadProgress(`✅ Succès: Logo uploadé`)
        toast.success("Logo uploadé avec succès")
      } else {
        setUploadProgress(`❌ Erreur: ${result.error}`)
        toast.error(`Erreur d'upload: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload logo:", error)
      setUploadProgress("❌ Erreur lors de l'upload du logo")
      toast.error("Erreur lors de l'upload du logo")
    } finally {
      setIsUploading(false)
      if (logoInputRef.current) {
        logoInputRef.current.value = ""
      }
    }
  }

  // Upload images de périodes
  const handlePeriodImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(`Préparation de ${files.length} images de périodes...`)

    const formData = new FormData()
    Array.from(files).forEach((file) => {
      formData.append("images", file)
    })

    try {
      setUploadProgress(`Upload de ${files.length} images de périodes en cours...`)
      const response = await fetch("/api/upload/period-images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadProgress(`✅ Succès: ${result.uploaded} images de périodes uploadées`)
        toast.success(`${result.uploaded} images de périodes uploadées avec succès`)
      } else {
        setUploadProgress(`❌ Erreur: ${result.error}`)
        toast.error(`Erreur d'upload: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur upload images de périodes:", error)
      setUploadProgress("❌ Erreur lors de l'upload des images de périodes")
      toast.error("Erreur lors de l'upload des images de périodes")
    } finally {
      setIsUploading(false)
      if (periodImagesInputRef.current) {
        periodImagesInputRef.current.value = ""
      }
    }
  }

  // Export CSV
  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/export/csv-data")
      const result = await response.json()

      if (result.success && result.data) {
        // Créer le contenu CSV avec toutes les colonnes
        const headers = [
          "Nom luminaire",
          "Artiste / Dates",
          "Année",
          "Spécialité",
          "Catégorie",
          "Collaboration / Œuvre",
          "Description",
          "Signé",
          "Dimensions",
          "Matériaux",
          "Estimation",
          "Editeur",
          "Nom du fichier",
        ]

        const csvContent = [
          headers.join(","),
          ...result.data.map((item: any) =>
            headers
              .map((header) => {
                let value = ""
                switch (header) {
                  case "Nom luminaire":
                    value = item["Nom luminaire"] || item.nom || ""
                    break
                  case "Artiste / Dates":
                    value = item["Artiste / Dates"] || item.designer || ""
                    break
                  case "Année":
                    value = item["Année"] || item.annee || ""
                    break
                  case "Spécialité":
                    value = item["Spécialité"] || item.periode || ""
                    break
                  case "Catégorie":
                    value = item["Catégorie"] || item.categorie || ""
                    break
                  case "Collaboration / Œuvre":
                    value = item["Collaboration / Œuvre"] || item.collaboration || ""
                    break
                  case "Description":
                    value = item["Description"] || item.description || ""
                    break
                  case "Signé":
                    value = item["Signé"] || item.signe || ""
                    break
                  case "Dimensions":
                    value = item["Dimensions"] || item.dimensions || ""
                    break
                  case "Matériaux":
                    value =
                      item["Matériaux"] ||
                      (Array.isArray(item.materiaux) ? item.materiaux.join(", ") : item.materiaux) ||
                      ""
                    break
                  case "Estimation":
                    value = item["Estimation"] || item.estimation || ""
                    break
                  case "Editeur":
                    value = item["Editeur"] || item.editeur || ""
                    break
                  case "Nom du fichier":
                    value = item["Nom du fichier"] || item.filename || ""
                    break
                  default:
                    value = ""
                }
                // Échapper les guillemets et entourer de guillemets si nécessaire
                if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
                  value = `"${value.replace(/"/g, '""')}"`
                }
                return value
              })
              .join(","),
          ),
        ].join("\n")

        // Télécharger le fichier
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `luminaires_export_${new Date().toISOString().split("T")[0]}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success(`Export réussi: ${result.data.length} luminaires exportés`)
      } else {
        toast.error("Erreur lors de l'export")
      }
    } catch (error) {
      console.error("❌ Erreur export:", error)
      toast.error("Erreur lors de l'export")
    } finally {
      setIsExporting(false)
    }
  }

  // Reset de la base de données
  const handleReset = async () => {
    if (!confirm("⚠️ ATTENTION: Cette action va supprimer TOUTES les données. Êtes-vous sûr ?")) {
      return
    }

    if (!confirm("🚨 DERNIÈRE CHANCE: Toutes les données seront perdues définitivement. Continuer ?")) {
      return
    }

    setIsUploading(true)
    setUploadProgress("Reset de la base de données en cours...")

    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        setUploadProgress("✅ Reset terminé avec succès")
        toast.success("Base de données réinitialisée avec succès")
      } else {
        setUploadProgress(`❌ Erreur reset: ${result.error}`)
        toast.error(`Erreur lors du reset: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur reset:", error)
      setUploadProgress("❌ Erreur lors du reset")
      toast.error("Erreur lors du reset")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-serif text-gray-900 mb-8">Import / Export</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Import CSV Luminaires */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Import CSV Luminaires
                </CardTitle>
                <CardDescription>Importer un fichier CSV contenant les données des luminaires</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="csv-file">Fichier CSV</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      disabled={isUploading}
                      ref={fileInputRef}
                    />
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                    style={{ backgroundColor: "#f2d895", color: "#000" }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Sélectionner un fichier CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import CSV Designers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Import CSV Designers
                </CardTitle>
                <CardDescription>Importer un fichier CSV contenant les données des designers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="designers-csv-file">Fichier CSV Designers</Label>
                    <Input
                      id="designers-csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleDesignersCSVUpload}
                      disabled={isUploading}
                      ref={designersFileInputRef}
                    />
                  </div>
                  <Button
                    onClick={() => designersFileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                    style={{ backgroundColor: "#f2d895", color: "#000" }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Sélectionner un fichier CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Import Images
                </CardTitle>
                <CardDescription>Importer plusieurs images de luminaires</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="images-file">Images (JPG, PNG, WebP)</Label>
                    <Input
                      id="images-file"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImagesUpload}
                      disabled={isUploading}
                      ref={imageInputRef}
                    />
                  </div>
                  <Button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                    style={{ backgroundColor: "#f2d895", color: "#000" }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Sélectionner des images
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import Vidéo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Import Vidéo
                </CardTitle>
                <CardDescription>Importer une vidéo de présentation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="video-file">Vidéo (MP4, WebM, AVI)</Label>
                    <Input
                      id="video-file"
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      disabled={isUploading}
                      ref={videoInputRef}
                    />
                  </div>
                  <Button
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                    style={{ backgroundColor: "#f2d895", color: "#000" }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Sélectionner une vidéo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Import Logo
                </CardTitle>
                <CardDescription>Importer le logo de l'application</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logo-file">Logo (PNG, SVG recommandé)</Label>
                    <Input
                      id="logo-file"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploading}
                      ref={logoInputRef}
                    />
                  </div>
                  <Button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                    style={{ backgroundColor: "#f2d895", color: "#000" }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Sélectionner un logo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import Images de Périodes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Images de Périodes
                </CardTitle>
                <CardDescription>Importer des images pour la chronologie</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="period-images-file">Images de périodes</Label>
                    <Input
                      id="period-images-file"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePeriodImagesUpload}
                      disabled={isUploading}
                      ref={periodImagesInputRef}
                    />
                  </div>
                  <Button
                    onClick={() => periodImagesInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                    style={{ backgroundColor: "#f2d895", color: "#000" }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Sélectionner des images
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export et Actions */}
          <div className="mt-8 space-y-6">
            {/* Export CSV */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export CSV
                </CardTitle>
                <CardDescription>Exporter toutes les données des luminaires au format CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="w-full"
                  style={{ backgroundColor: "#f2d895", color: "#000" }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? "Export en cours..." : "Exporter les données CSV"}
                </Button>
              </CardContent>
            </Card>

            {/* Reset Database */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  Reset Base de Données
                </CardTitle>
                <CardDescription className="text-red-500">
                  ⚠️ DANGER: Cette action supprime toutes les données de façon irréversible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleReset} disabled={isUploading} variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset complet de la base de données
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Status */}
          {(isUploading || uploadProgress) && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    {isUploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />}
                  </div>
                  <Textarea value={uploadProgress} readOnly rows={3} className="font-mono text-sm" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
