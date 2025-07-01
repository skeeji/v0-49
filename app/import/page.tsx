"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, ImageIcon, Video, Palette, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react"
import { UploadForm } from "@/components/UploadForm"
import { toast } from "@/components/ui/toast"

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
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [periodImageFile, setPeriodImageFile] = useState<File | null>(null)
  const [isUploadingPeriodImage, setIsUploadingPeriodImage] = useState(false)
  const [periodImageMessage, setPeriodImageMessage] = useState("")

  const csvFileRef = useRef<HTMLInputElement>(null)
  const designersFileRef = useRef<HTMLInputElement>(null)
  const imagesFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)
  const periodImageFileRef = useRef<HTMLInputElement>(null)

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

  const handlePeriodImageUpload = async () => {
    if (!periodImageFile || !selectedPeriod) {
      setPeriodImageMessage("Veuillez sélectionner une période et un fichier")
      return
    }

    setIsUploadingPeriodImage(true)
    setPeriodImageMessage("")

    try {
      const formData = new FormData()
      formData.append("file", periodImageFile)
      formData.append("periodName", selectedPeriod)

      const response = await fetch("/api/upload/period-images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setPeriodImageMessage(`✅ ${result.message}`)
        setPeriodImageFile(null)
        setSelectedPeriod("")
        // Reset du input file
        const fileInput = document.getElementById("period-image-file") as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } else {
        setPeriodImageMessage(`❌ ${result.message}`)
      }
    } catch (error) {
      console.error("Erreur upload image période:", error)
      setPeriodImageMessage("❌ Erreur lors de l'upload")
    } finally {
      setIsUploadingPeriodImage(false)
    }
  }

  const exportAllLuminaires = async () => {
    setExportingCSV(true)
    try {
      console.log("📊 Export de tous les luminaires...")

      // Récupérer tous les luminaires avec les informations des designers
      const luminairesResponse = await fetch("/api/luminaires?limit=10000")
      const luminairesData = await luminairesResponse.json()

      const designersResponse = await fetch("/api/designers-data")
      const designersData = await designersResponse.json()

      if (luminairesData.success && designersData.success) {
        // Créer un map des designers pour récupérer rapidement l'image
        const designersMap = new Map()
        designersData.designers.forEach((designer: any) => {
          designersMap.set(designer.Nom, designer.imagedesigner || "")
        })

        // Préparer les données pour l'export avec toutes les informations
        const csvData = luminairesData.luminaires.map((luminaire: any) => ({
          "Nom luminaire": luminaire["Nom luminaire"] || luminaire.nom || "",
          "Nom du fichier": luminaire["Nom du fichier"] || "",
          "Artiste / Dates": luminaire["Artiste / Dates"] || luminaire.designer || "",
          "Image Designer": designersMap.get(luminaire["Artiste / Dates"] || luminaire.designer) || "",
          Spécialité: luminaire["Spécialité"] || luminaire.specialite || "",
          "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"] || luminaire.collaboration || "",
          Année: luminaire["Année"] || luminaire.annee || "",
          Signé: luminaire["Signé"] || luminaire.signe || "",
          Période: luminaire["Période"] || luminaire.periode || "",
          Matériaux: Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join("; ") : luminaire.materiaux || "",
          Couleurs: Array.isArray(luminaire.couleurs) ? luminaire.couleurs.join("; ") : luminaire.couleurs || "",
          Description: luminaire.description || "",
          Prix: luminaire.prix || "",
          Dimensions: luminaire.dimensions || "",
          État: luminaire.etat || "",
        }))

        // Créer le contenu CSV
        const headers = Object.keys(csvData[0])
        const csvContent = [
          headers.join(","),
          ...csvData.map((row) =>
            headers.map((header) => `"${(row[header] || "").toString().replace(/"/g, '""')}"`).join(","),
          ),
        ].join("\n")

        // Créer et télécharger le fichier
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `luminaires_complet_${new Date().toISOString().split("T")[0]}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        console.log(`✅ Export terminé: ${csvData.length} luminaires exportés`)
        toast({
          title: "✅ Export terminé",
          description: `${csvData.length} luminaires exportés`,
        })
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'export:", error)
      toast({
        title: "❌ Erreur export",
        description: "Erreur lors de l'export CSV",
        variant: "destructive",
      })
    } finally {
      setExportingCSV(false)
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

        {/* Bouton d'export CSV */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-600">Export des données</CardTitle>
            <CardDescription>Exportez tous les luminaires avec les informations complètes</CardDescription>
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
                  <Upload className="w-4 h-4 mr-2" />
                  Exporter tous les luminaires (CSV)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Import CSV Luminaires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                CSV Luminaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UploadForm />
            </CardContent>
          </Card>

          {/* Import Images Périodes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Images Périodes Chronologiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="period-select">Période</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une période" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((period) => (
                        <SelectItem key={period} value={period}>
                          {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="period-image-file">Image illustrative</Label>
                  <Input
                    id="period-image-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPeriodImageFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <Button
                onClick={handlePeriodImageUpload}
                disabled={isUploadingPeriodImage || !selectedPeriod || !periodImageFile}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploadingPeriodImage ? "Upload en cours..." : "Uploader l'image de période"}
              </Button>

              {periodImageMessage && <div className="text-sm mt-2">{periodImageMessage}</div>}
            </CardContent>
          </Card>

          {/* Import Images Luminaires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images Luminaires
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

          {/* Import Vidéos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Vidéos
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
                Sélectionner Vidéos
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

          {/* Import CSV Designers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                CSV Designers
              </CardTitle>
            </CardHeader>
            <CardContent>
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

          {/* Import Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
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
                          {results.csv.errors.length > 10 && <div>... et {results.csv.errors.length - 10} autres</div>}
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
                    <h4 className="font-medium">Images Luminaires</h4>
                    <div className="text-sm text-gray-600">
                      {results.images.reduce((sum, r) => sum + (r.uploaded || 0), 0)} images uploadées au total
                    </div>
                  </div>
                )}

                {results.video && (
                  <div>
                    <h4 className="font-medium">Vidéos</h4>
                    <div className="text-sm text-gray-600">{results.video.message}</div>
                  </div>
                )}

                {results.logo && (
                  <div>
                    <h4 className="font-medium">Logo</h4>
                    <div className="text-sm text-gray-600">{results.logo.message}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
