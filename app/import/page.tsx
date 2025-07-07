"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle,
  XCircle,
  Upload,
  Users,
  ImageIcon,
  Video,
  FileImage,
  Download,
  Trash2,
  Clock,
  Calendar,
  Archive,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RoleGuard } from "@/components/RoleGuard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

interface ImportResult {
  success: boolean
  message: string
  imported?: number
  processed?: number
  uploaded?: number
  associated?: number
  remaining?: number
  errors?: string[]
}

const periods = [
  "Moyen-Age",
  "XVIe siècle",
  "XVIIe siècle",
  "XVIIIe siècle",
  "XIXe siècle",
  "Art Nouveau",
  "Art Déco",
  "1940 - 1949",
  "1950 - 1959",
  "1960 - 1969",
  "1970 - 1979",
  "1980 - 1989",
  "1990 - 1999",
  "Contemporain",
]

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [results, setResults] = useState<{
    csv?: ImportResult
    designers?: ImportResult
    images?: ImportResult[]
    video?: ImportResult
    logo?: ImportResult
    reset?: ImportResult
    periodImages?: { [key: string]: ImportResult }
  }>({})
  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingImages, setExportingImages] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState("")

  const csvFileRef = useRef<HTMLInputElement>(null)
  const designersFileRef = useRef<HTMLInputElement>(null)
  const imagesFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)
  const periodImageFileRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log(`📁 Fichier CSV sélectionné: ${file.name}, taille: ${file.size} bytes`)

    const estimatedLines = Math.floor(file.size / 130)
    console.log(`📊 Estimation: ~${estimatedLines} lignes dans le CSV`)

    setIsUploading(true)
    setCurrentStep("Import du CSV luminaires...")
    setUploadProgress(10)

    try {
      console.log("📥 Début de l'import CSV:", file.name)

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload/csv", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API CSV:", result)

      setResults((prev) => ({ ...prev, csv: result }))

      if (result.success) {
        toast({
          title: "✅ CSV importé",
          description: result.message,
        })
      } else {
        toast({
          title: "❌ Erreur CSV",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import CSV:", error)
      toast({
        title: "❌ Erreur critique",
        description: "Impossible d'importer le CSV",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentStep("")
    }
  }

  const handleDesignersUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log(`📁 Fichier CSV designers sélectionné: ${file.name}, taille: ${file.size} bytes`)

    const estimatedLines = Math.floor(file.size / 44)
    console.log(`📊 Estimation: ~${estimatedLines} lignes dans le CSV`)

    setIsUploading(true)
    setCurrentStep("Import des designers...")
    setUploadProgress(10)

    try {
      console.log("👨‍🎨 Début de l'import designers:", file.name)

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload/csv-designers", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API designers:", result)

      setResults((prev) => ({ ...prev, designers: result }))

      if (result.success) {
        toast({
          title: "✅ Designers importés",
          description: result.message,
        })
      } else {
        toast({
          title: "❌ Erreur designers",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import designers:", error)
      toast({
        title: "❌ Erreur critique",
        description: "Impossible d'importer les designers",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentStep("")
    }
  }

  const handleImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    console.log(`🖼️ Début de l'upload images: ${files.length} fichiers`)

    setIsUploading(true)
    setCurrentStep("Upload des images...")
    setUploadProgress(5)

    const allResults: ImportResult[] = []

    try {
      // Traiter par petits batches de 50 fichiers
      const BATCH_SIZE = 50
      let totalUploaded = 0
      let totalAssociated = 0

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE)
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(files.length / BATCH_SIZE)

        setCurrentStep(`Upload batch ${batchNumber}/${totalBatches} (${batch.length} images)`)
        setUploadProgress(5 + (i / files.length) * 90)

        console.log(`📦 Batch ${batchNumber}/${totalBatches}: ${batch.length} fichiers`)

        const formData = new FormData()
        batch.forEach((file) => {
          formData.append("images", file)
        })

        try {
          const response = await fetch("/api/upload/images", {
            method: "POST",
            body: formData,
          })

          const result = await response.json()
          allResults.push(result)

          if (result.success) {
            totalUploaded += result.uploaded || 0
            totalAssociated += result.associated || 0
            console.log(`✅ Batch ${batchNumber}: ${result.uploaded} uploadées, ${result.associated} associées`)
          } else {
            console.error(`❌ Erreur batch ${batchNumber}:`, result.error)
          }

          // Pause entre les batches
          if (i + BATCH_SIZE < files.length) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        } catch (batchError: any) {
          console.error(`❌ Erreur critique batch ${batchNumber}:`, batchError)
          allResults.push({
            success: false,
            message: `Erreur batch ${batchNumber}: ${batchError.message}`,
          })
        }
      }

      setResults((prev) => ({ ...prev, images: allResults }))

      toast({
        title: "✅ Upload terminé",
        description: `${totalUploaded} images uploadées, ${totalAssociated} associées`,
      })
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload images:", error)
      toast({
        title: "❌ Erreur critique",
        description: "Impossible d'uploader les images",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentStep("")
    }
  }

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log(`🎥 Fichier vidéo sélectionné: ${file.name}, taille: ${file.size} bytes`)

    setIsUploading(true)
    setCurrentStep("Upload de la vidéo de fond...")
    setUploadProgress(10)

    try {
      console.log("🎥 Début de l'upload vidéo:", file.name)

      const formData = new FormData()
      formData.append("video", file)

      const response = await fetch("/api/upload/video", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API vidéo:", result)

      setResults((prev) => ({ ...prev, video: result }))

      if (result.success) {
        toast({
          title: "✅ Vidéo uploadée",
          description: result.message,
        })
      } else {
        toast({
          title: "❌ Erreur vidéo",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload vidéo:", error)
      toast({
        title: "❌ Erreur critique",
        description: "Impossible d'uploader la vidéo",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentStep("")
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log(`🏷️ Fichier logo sélectionné: ${file.name}, taille: ${file.size} bytes`)

    setIsUploading(true)
    setCurrentStep("Upload du logo...")
    setUploadProgress(10)

    try {
      console.log("🏷️ Début de l'upload logo:", file.name)

      const formData = new FormData()
      formData.append("logo", file)

      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API logo:", result)

      setResults((prev) => ({ ...prev, logo: result }))

      if (result.success) {
        toast({
          title: "✅ Logo uploadé",
          description: result.message,
        })
      } else {
        toast({
          title: "❌ Erreur logo",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload logo:", error)
      toast({
        title: "❌ Erreur critique",
        description: "Impossible d'uploader le logo",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentStep("")
    }
  }

  const handlePeriodImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedPeriod) return

    console.log(`🖼️ Upload image pour période: ${selectedPeriod}`)

    setIsUploading(true)
    setCurrentStep(`Upload image pour ${selectedPeriod}...`)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("periodName", selectedPeriod)

      const response = await fetch("/api/upload/period-images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Réponse API image période:", result)

      setResults((prev) => ({
        ...prev,
        periodImages: {
          ...prev.periodImages,
          [selectedPeriod]: result,
        },
      }))

      if (result.success) {
        toast({
          title: "✅ Image période uploadée",
          description: result.message,
        })
        setSelectedPeriod("")
      } else {
        toast({
          title: "❌ Erreur image période",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ Erreur critique upload image période:", error)
      toast({
        title: "❌ Erreur critique",
        description: "Impossible d'uploader l'image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentStep("")
    }
  }

  const exportAllLuminaires = async () => {
    setExportingCSV(true)
    try {
      console.log("📊 Export Excel avec images...")

      // Récupérer tous les luminaires avec les informations des designers
      const luminairesResponse = await fetch("/api/luminaires?limit=10000")
      const luminairesData = await luminairesResponse.json()

      const designersResponse = await fetch("/api/designers-data")
      const designersData = await designersResponse.json()

      if (luminairesData.success && designersData.success) {
        // Créer un map des designers pour récupérer rapidement l'image
        const designersMap = new Map()
        designersData.designers.forEach((designer: any) => {
          designersMap.set(designer.Nom, designer)
        })

        // Créer le classeur Excel
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet("Luminaires")

        // Définir les colonnes
        worksheet.columns = [
          { header: "Image Luminaire", key: "imgLuminaire", width: 25 },
          { header: "Image Designer", key: "imgDesigner", width: 25 },
          { header: "Nom luminaire", key: "nom", width: 35 },
          { header: "Artiste / Dates", key: "designer", width: 35 },
          { header: "Année", key: "annee", width: 10 },
          { header: "Période", key: "periode", width: 25 },
          { header: "Description", key: "description", width: 50 },
          { header: "Matériaux", key: "materiaux", width: 40 },
          { header: "Couleurs", key: "couleurs", width: 40 },
          { header: "Nom du fichier", key: "filename", width: 35 },
        ]

        // Remplir les données avec images
        for (const luminaire of luminairesData.luminaires) {
          let luminaireImageId = null
          let designerImageId = null

          // Récupérer l'image du luminaire
          if (luminaire.filename || luminaire["Nom du fichier"]) {
            try {
              const filename = luminaire.filename || luminaire["Nom du fichier"]
              const imageResponse = await fetch(`/api/images/filename/${filename}`)
              if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer()
                luminaireImageId = workbook.addImage({
                  buffer: imageBuffer,
                  extension: "jpeg",
                })
              }
            } catch (error) {
              console.log(`❌ Erreur récupération image luminaire: ${luminaire.filename}`)
            }
          }

          // Récupérer l'image du designer
          const designerName = luminaire.designer || luminaire["Artiste / Dates"]
          const designer = designersMap.get(designerName)
          if (designer && designer.imagedesigner) {
            try {
              const designerImageResponse = await fetch(`/api/images/filename/${designer.imagedesigner}`)
              if (designerImageResponse.ok) {
                const designerImageBuffer = await designerImageResponse.arrayBuffer()
                designerImageId = workbook.addImage({
                  buffer: designerImageBuffer,
                  extension: "jpeg",
                })
              }
            } catch (error) {
              console.log(`❌ Erreur récupération image designer: ${designer.imagedesigner}`)
            }
          }

          // Ajouter la ligne de données
          const row = worksheet.addRow({
            nom: luminaire.nom || luminaire["Nom luminaire"] || "",
            designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
            annee: luminaire.annee || luminaire["Année"] || "",
            periode: luminaire.periode || luminaire["Période"] || "",
            description: luminaire.description || "",
            materiaux: Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join("; ") : luminaire.materiaux || "",
            couleurs: Array.isArray(luminaire.couleurs) ? luminaire.couleurs.join("; ") : luminaire.couleurs || "",
            filename: luminaire.filename || luminaire["Nom du fichier"] || "",
          })

          // Définir la hauteur de ligne pour les images
          row.height = 100

          // Ajouter les images aux cellules
          if (luminaireImageId) {
            worksheet.addImage(luminaireImageId, `A${row.number}:A${row.number}`)
          }
          if (designerImageId) {
            worksheet.addImage(designerImageId, `B${row.number}:B${row.number}`)
          }
        }

        // Générer et télécharger le fichier
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
        saveAs(blob, `Export_Luminaires_${new Date().toISOString().split("T")[0]}.xlsx`)

        console.log(`✅ Export Excel terminé: ${luminairesData.luminaires.length} luminaires exportés`)
        toast({
          title: "✅ Export terminé",
          description: `${luminairesData.luminaires.length} luminaires exportés en Excel avec images`,
        })
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'export Excel:", error)
      toast({
        title: "❌ Erreur export",
        description: "Erreur lors de l'export Excel",
        variant: "destructive",
      })
    } finally {
      setExportingCSV(false)
    }
  }

  const exportAllImages = async () => {
    setExportingImages(true)
    try {
      console.log("📦 Export de toutes les images...")

      const response = await fetch("/api/export/images", {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'export des images")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `images_export_${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "✅ Export terminé",
        description: "Toutes les images ont été exportées",
      })
    } catch (error: any) {
      console.error("❌ Erreur lors de l'export des images:", error)
      toast({
        title: "❌ Erreur export",
        description: "Erreur lors de l'export des images",
        variant: "destructive",
      })
    } finally {
      setExportingImages(false)
    }
  }

  const resetDatabase = async () => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir vider toute la base de données ? Cette action supprimera TOUS les luminaires, designers, images, vidéos et logos.",
      )
    ) {
      return
    }

    setIsUploading(true)
    setCurrentStep("Suppression de la base de données...")
    setUploadProgress(50)

    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      })

      const result = await response.json()
      console.log("🗑️ Base de données vidée:", result)

      setResults((prev) => ({ ...prev, reset: result }))

      if (result.success) {
        toast({
          title: "✅ Base vidée",
          description: result.message,
        })
      } else {
        toast({
          title: "❌ Erreur reset",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ Erreur lors du reset:", error)
      toast({
        title: "❌ Erreur critique",
        description: "Impossible de vider la base",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentStep("")
    }
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-serif text-gray-900 mb-4">Import des Données</h1>
            <p className="text-gray-600">Importez vos fichiers CSV et images pour alimenter la galerie</p>
          </div>

          {/* Barre de progression globale */}
          {isUploading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-sm font-medium">{currentStep}</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Boutons d'export */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-600">Export Excel avec images</CardTitle>
                <CardDescription>Exportez tous les luminaires avec images intégrées</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={exportAllLuminaires} disabled={exportingCSV || isUploading} className="w-full">
                  {exportingCSV ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Export en cours...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Exporter tous les luminaires (Excel)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-600">Export des images</CardTitle>
                <CardDescription>Téléchargez toutes les images de la base de données</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={exportAllImages} disabled={exportingImages || isUploading} className="w-full">
                  {exportingImages ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Export en cours...
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 mr-2" />
                      Télécharger toutes les images (ZIP)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Upload CSV Luminaires */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  CSV Luminaires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input ref={csvFileRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                <Button
                  onClick={() => csvFileRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner CSV
                </Button>

                {results.csv && (
                  <div className="text-sm">
                    {results.csv.success ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{results.csv.imported} luminaires importés</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span>Erreur d'import</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload CSV Designers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  CSV Designers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={designersFileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleDesignersUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => designersFileRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner CSV
                </Button>

                {results.designers && (
                  <div className="text-sm">
                    {results.designers.success ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{results.designers.imported} designers importés</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span>Erreur d'import</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Images
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={imagesFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => imagesFileRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner Images
                </Button>

                {results.images && results.images.length > 0 && (
                  <div className="text-sm space-y-1">
                    {results.images.map((result, index) => (
                      <div key={index}>
                        {result.success ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>
                              Batch {index + 1}: {result.uploaded} uploadées, {result.associated} associées
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>Batch {index + 1}: Erreur</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Images de Périodes */}
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Calendar className="w-5 h-5" />
                  Images Périodes
                </CardTitle>
                <CardDescription>Images illustratives pour la chronologie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une période" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period} value={period}>
                        {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <input
                  ref={periodImageFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePeriodImageUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => periodImageFileRef.current?.click()}
                  disabled={isUploading || !selectedPeriod}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Uploader Image
                </Button>

                {results.periodImages && Object.keys(results.periodImages).length > 0 && (
                  <div className="text-sm space-y-1">
                    {Object.entries(results.periodImages).map(([period, result]) => (
                      <div key={period}>
                        {result.success ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>{period}: Image uploadée</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>{period}: Erreur</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Vidéo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Vidéo de fond
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={videoFileRef}
                  type="file"
                  accept="video/mp4"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => videoFileRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner Vidéo
                </Button>

                {results.video && (
                  <div className="text-sm">
                    {results.video.success ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Vidéo uploadée</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span>Erreur upload vidéo</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  Logo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input ref={logoFileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <Button
                  onClick={() => logoFileRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner Logo
                </Button>

                {results.logo && (
                  <div className="text-sm">
                    {results.logo.success ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Logo uploadé</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span>Erreur upload logo</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reset Database */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  Reset Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={resetDatabase} disabled={isUploading} className="w-full" variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Vider la Base
                </Button>

                {results.reset && (
                  <div className="text-sm">
                    {results.reset.success ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Base vidée</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span>Erreur reset</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Résultats détaillés */}
          {(results.csv || results.designers || results.images) && (
            <Card>
              <CardHeader>
                <CardTitle>Résultats de l'import</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.csv && (
                    <div>
                      <h4 className="font-medium">Luminaires CSV</h4>
                      <p className="text-sm text-gray-600">{results.csv.message}</p>
                      {results.csv.errors && results.csv.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-red-600 cursor-pointer">
                            {results.csv.errors.length} erreurs
                          </summary>
                          <div className="mt-2 text-xs text-red-600 max-h-32 overflow-y-auto">
                            {results.csv.errors.slice(0, 10).map((error, i) => (
                              <div key={i}>{error}</div>
                            ))}
                            {results.csv.errors.length > 10 && (
                              <div>... et {results.csv.errors.length - 10} autres</div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {results.designers && (
                    <div>
                      <h4 className="font-medium">Designers CSV</h4>
                      <p className="text-sm text-gray-600">{results.designers.message}</p>
                    </div>
                  )}

                  {results.images && (
                    <div>
                      <h4 className="font-medium">Images</h4>
                      <div className="text-sm text-gray-600">
                        {results.images.reduce((sum, r) => sum + (r.uploaded || 0), 0)} images uploadées au total
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
