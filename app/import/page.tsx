"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  Upload,
  FileText,
  ImageIcon,
  Download,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Database,
  Users,
  Lightbulb,
  Calendar,
} from "lucide-react"
import * as XLSX from "xlsx"

interface ImportStats {
  totalLuminaires: number
  totalDesigners: number
  totalImages: number
  lastImport: string | null
}

interface CSVRow {
  [key: string]: string
}

export default function ImportPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const [designerImageFiles, setDesignerImageFiles] = useState<FileList | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResults, setUploadResults] = useState<any>(null)
  const [stats, setStats] = useState<ImportStats>({
    totalLuminaires: 0,
    totalDesigners: 0,
    totalImages: 0,
    lastImport: null,
  })
  const [csvPreview, setCsvPreview] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const csvInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const designerImageInputRef = useRef<HTMLInputElement>(null)

  // Charger les statistiques au montage - CORRECTION: useEffect au lieu de useState
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch("/api/luminaires?limit=1")
      const data = await response.json()
      if (data.success) {
        setStats((prev) => ({
          ...prev,
          totalLuminaires: data.pagination.total,
        }))
      }
    } catch (error) {
      console.error("Erreur chargement stats:", error)
    }
  }

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCsvFile(file)
      previewCsv(file)
    }
  }

  const previewCsv = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length === 0) return

      // Détecter le séparateur
      const firstLine = lines[0]
      const separators = [",", ";", "\t"]
      let separator = ","

      for (const sep of separators) {
        if (firstLine.split(sep).length > 1) {
          separator = sep
          break
        }
      }

      // Parser les en-têtes
      const headers = lines[0].split(separator).map((h) => h.trim().replace(/"/g, ""))
      setCsvHeaders(headers)

      // Parser quelques lignes pour l'aperçu
      const preview = lines.slice(1, 6).map((line) => {
        const values = line.split(separator).map((v) => v.trim().replace(/"/g, ""))
        const row: CSVRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })
        return row
      })

      setCsvPreview(preview)
    } catch (error) {
      console.error("Erreur preview CSV:", error)
      toast.error("Erreur lors de la lecture du fichier CSV")
    }
  }

  const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageFiles(e.target.files)
  }

  const handleDesignerImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDesignerImageFiles(e.target.files)
  }

  const handleImport = async () => {
    if (!csvFile) {
      toast.error("Veuillez sélectionner un fichier CSV")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadResults(null)

    try {
      // 1. Upload du CSV
      console.log("📤 Upload du fichier CSV...")
      const csvFormData = new FormData()
      csvFormData.append("csv", csvFile)

      const csvResponse = await fetch("/api/upload/csv", {
        method: "POST",
        body: csvFormData,
      })

      const csvResult = await csvResponse.json()
      console.log("📊 Résultat upload CSV:", csvResult)

      if (!csvResult.success) {
        throw new Error(csvResult.error || "Erreur lors de l'upload du CSV")
      }

      setUploadProgress(30)

      // 2. Upload des images de luminaires
      let imageResults = null
      if (imageFiles && imageFiles.length > 0) {
        console.log(`📸 Upload de ${imageFiles.length} images de luminaires...`)
        const imageFormData = new FormData()
        Array.from(imageFiles).forEach((file) => {
          imageFormData.append("images", file)
        })

        const imageResponse = await fetch("/api/upload/images", {
          method: "POST",
          body: imageFormData,
        })

        imageResults = await imageResponse.json()
        console.log("📸 Résultat upload images:", imageResults)
      }

      setUploadProgress(60)

      // 3. Upload des images de designers
      let designerImageResults = null
      if (designerImageFiles && designerImageFiles.length > 0) {
        console.log(`👤 Upload de ${designerImageFiles.length} images de designers...`)
        const designerFormData = new FormData()
        Array.from(designerImageFiles).forEach((file) => {
          designerFormData.append("images", file)
        })

        const designerResponse = await fetch("/api/upload/images", {
          method: "POST",
          body: designerFormData,
        })

        designerImageResults = await designerResponse.json()
        console.log("👤 Résultat upload images designers:", designerImageResults)
      }

      setUploadProgress(100)

      // Résultats finaux
      const finalResults = {
        csv: csvResult,
        images: imageResults,
        designerImages: designerImageResults,
        totalProcessed: csvResult.imported || 0,
        totalImages: (imageResults?.uploaded || 0) + (designerImageResults?.uploaded || 0),
      }

      setUploadResults(finalResults)
      toast.success(`Import terminé ! ${finalResults.totalProcessed} luminaires importés`)

      // Recharger les stats
      await loadStats()

      // Reset des fichiers
      setCsvFile(null)
      setImageFiles(null)
      setDesignerImageFiles(null)
      setCsvPreview([])
      setCsvHeaders([])
      if (csvInputRef.current) csvInputRef.current.value = ""
      if (imageInputRef.current) imageInputRef.current.value = ""
      if (designerImageInputRef.current) designerImageInputRef.current.value = ""
    } catch (error: any) {
      console.error("❌ Erreur import:", error)
      toast.error(`Erreur lors de l'import: ${error.message}`)
      setUploadResults({
        error: error.message,
        csv: null,
        images: null,
        designerImages: null,
      })
    } finally {
      setIsUploading(false)
    }
  }

  const exportAllLuminaires = async () => {
    setIsExporting(true)
    try {
      console.log("📊 Début de l'export de tous les luminaires...")

      // Récupérer TOUS les luminaires
      const response = await fetch("/api/luminaires?limit=9999")
      const data = await response.json()

      if (!data.success) {
        throw new Error("Erreur lors de la récupération des luminaires")
      }

      console.log(`📋 ${data.luminaires.length} luminaires récupérés pour l'export`)

      // Préparer les données pour l'export avec logique de secours renforcée
      const exportData = data.luminaires.map((luminaire: any, index: number) => {
        console.log(`🔄 Traitement luminaire ${index + 1}/${data.luminaires.length}: ${luminaire.nom || "Sans nom"}`)

        // LOGIQUE DE SECOURS POUR SPÉCIALITÉ
        let specialite = ""
        if (luminaire.periode && String(luminaire.periode).trim() !== "") {
          specialite = String(luminaire.periode).trim()
          console.log(`  📋 Spécialité depuis "periode": ${specialite}`)
        } else if (luminaire["Spécialité"] && String(luminaire["Spécialité"]).trim() !== "") {
          specialite = String(luminaire["Spécialité"]).trim()
          console.log(`  📋 Spécialité depuis "Spécialité": ${specialite}`)
        } else {
          console.log(`  ⚠️ Aucune spécialité trouvée pour ${luminaire.nom}`)
        }

        // LOGIQUE DE SECOURS POUR COLLABORATION / ŒUVRE
        let collaboration = ""
        if (luminaire.collaboration && String(luminaire.collaboration).trim() !== "") {
          collaboration = String(luminaire.collaboration).trim()
          console.log(`  📋 Collaboration depuis "collaboration": ${collaboration}`)
        } else if (luminaire["Collaboration / Œuvre"] && String(luminaire["Collaboration / Œuvre"]).trim() !== "") {
          collaboration = String(luminaire["Collaboration / Œuvre"]).trim()
          console.log(`  📋 Collaboration depuis "Collaboration / Œuvre": ${collaboration}`)
        } else {
          console.log(`  ⚠️ Aucune collaboration trouvée pour ${luminaire.nom}`)
        }

        return {
          "Nom luminaire": String(luminaire.nom || luminaire["Nom luminaire"] || ""),
          "Artiste / Dates": String(luminaire.designer || luminaire["Artiste / Dates"] || ""),
          Année: String(luminaire.annee || luminaire["Année"] || ""),
          Spécialité: specialite, // Utilise la logique de secours
          "Collaboration / Œuvre": collaboration, // Utilise la logique de secours
          Signé: String(luminaire.signe || luminaire["Signé"] || ""),
          "Nom du fichier": String(luminaire.filename || luminaire["Nom du fichier"] || ""),
          Description: String(luminaire.description || ""),
          Editeur: String(luminaire.editeur || ""),
          Dimensions: String(luminaire.dimensions || ""),
          Estimation: String(luminaire.estimation || ""),
          Matériaux: Array.isArray(luminaire.materiaux)
            ? luminaire.materiaux.join(", ")
            : String(luminaire.materiaux || ""),
          Couleurs: Array.isArray(luminaire.couleurs)
            ? luminaire.couleurs.join(", ")
            : String(luminaire.couleurs || ""),
        }
      })

      console.log("📊 Exemple de données exportées (premier luminaire):", exportData[0])

      // Créer le fichier Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Luminaires")

      // Télécharger le fichier
      const today = new Date().toISOString().split("T")[0]
      const filename = `luminaires_export_${today}.xlsx`
      XLSX.writeFile(workbook, filename)

      console.log(`✅ Export terminé: ${filename}`)
      toast.success(`Export terminé ! ${exportData.length} luminaires exportés`)
    } catch (error: any) {
      console.error("❌ Erreur export:", error)
      toast.error(`Erreur lors de l'export: ${error.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const resetDatabase = async () => {
    if (!confirm("⚠️ ATTENTION: Cette action va supprimer TOUTES les données. Êtes-vous sûr ?")) {
      return
    }

    try {
      const response = await fetch("/api/reset", { method: "POST" })
      const result = await response.json()

      if (result.success) {
        toast.success("Base de données réinitialisée avec succès")
        await loadStats()
        setUploadResults(null)
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("❌ Erreur reset:", error)
      toast.error(`Erreur lors de la réinitialisation: ${error.message}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Import de données</h1>
          <p className="text-gray-600">Importez vos luminaires et images en masse depuis un fichier CSV</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Luminaires</p>
                  <p className="text-2xl font-bold">{stats.totalLuminaires}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Designers</p>
                  <p className="text-2xl font-bold">{stats.totalDesigners}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Images</p>
                  <p className="text-2xl font-bold">{stats.totalImages}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dernier import</p>
                  <p className="text-sm font-medium">{stats.lastImport || "Jamais"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="manage">Gestion</TabsTrigger>
          </TabsList>

          {/* Onglet Import */}
          <TabsContent value="import" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload CSV */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Fichier CSV
                  </CardTitle>
                  <CardDescription>Fichier contenant les données des luminaires (obligatoire)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="csv-file">Sélectionner le fichier CSV</Label>
                    <Input
                      ref={csvInputRef}
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="mt-1"
                    />
                  </div>

                  {csvFile && (
                    <Alert>
                      <CheckCircle className="w-4 h-4" />
                      <AlertDescription>
                        Fichier sélectionné: <strong>{csvFile.name}</strong>
                        <br />
                        {csvHeaders.length > 0 && (
                          <span className="text-sm text-gray-600">
                            {csvHeaders.length} colonnes détectées, {csvPreview.length} lignes d'aperçu
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Upload Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Images des luminaires
                  </CardTitle>
                  <CardDescription>Images des luminaires (optionnel)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="image-files">Sélectionner les images</Label>
                    <Input
                      ref={imageInputRef}
                      id="image-files"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFilesChange}
                      className="mt-1"
                    />
                  </div>

                  {imageFiles && imageFiles.length > 0 && (
                    <Alert>
                      <CheckCircle className="w-4 h-4" />
                      <AlertDescription>
                        <strong>{imageFiles.length}</strong> image(s) sélectionnée(s)
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Upload Images Designers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Images des designers
                  </CardTitle>
                  <CardDescription>Photos des designers/artistes (optionnel)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="designer-image-files">Sélectionner les images</Label>
                    <Input
                      ref={designerImageInputRef}
                      id="designer-image-files"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleDesignerImageFilesChange}
                      className="mt-1"
                    />
                  </div>

                  {designerImageFiles && designerImageFiles.length > 0 && (
                    <Alert>
                      <CheckCircle className="w-4 h-4" />
                      <AlertDescription>
                        <strong>{designerImageFiles.length}</strong> image(s) de designer(s) sélectionnée(s)
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Bouton d'import */}
              <Card>
                <CardContent className="p-6">
                  <Button
                    onClick={handleImport}
                    disabled={!csvFile || isUploading}
                    className="w-full"
                    style={{ backgroundColor: "#f2d895", color: "#000" }}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Import en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Lancer l'import
                      </>
                    )}
                  </Button>

                  {isUploading && (
                    <div className="mt-4">
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-sm text-gray-600 mt-2 text-center">{uploadProgress}%</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Aperçu CSV */}
            {csvPreview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Aperçu du fichier CSV</CardTitle>
                  <CardDescription>
                    Premières lignes du fichier ({csvPreview.length} sur {csvHeaders.length} colonnes)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {csvHeaders.map((header, index) => (
                            <TableHead key={index} className="whitespace-nowrap">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreview.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {csvHeaders.map((header, colIndex) => (
                              <TableCell key={colIndex} className="whitespace-nowrap max-w-32 truncate">
                                {row[header] || ""}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Résultats d'import */}
            {uploadResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {uploadResults.error ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    Résultats de l'import
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {uploadResults.error ? (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{uploadResults.error}</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{uploadResults.totalProcessed}</p>
                        <p className="text-sm text-green-700">Luminaires importés</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{uploadResults.totalImages}</p>
                        <p className="text-sm text-blue-700">Images uploadées</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {uploadResults.designerImages?.uploaded || 0}
                        </p>
                        <p className="text-sm text-purple-700">Images designers</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onglet Export */}
          <TabsContent value="export" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Excel
                  </CardTitle>
                  <CardDescription>Exporter tous les luminaires au format Excel (.xlsx)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={exportAllLuminaires}
                    disabled={isExporting}
                    className="w-full bg-transparent"
                    variant="outline"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Export en cours...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Exporter en Excel
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Export Images
                  </CardTitle>
                  <CardDescription>Télécharger toutes les images dans un fichier ZIP</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => window.open("/api/export/images", "_blank")}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger les images
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Onglet Gestion */}
          <TabsContent value="manage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Database className="w-5 h-5" />
                  Zone de danger
                </CardTitle>
                <CardDescription>Actions irréversibles sur la base de données</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Attention :</strong> Cette action supprimera définitivement toutes les données (luminaires,
                    designers, images). Cette action est irréversible.
                  </AlertDescription>
                </Alert>

                <Button onClick={resetDatabase} variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Réinitialiser la base de données
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
