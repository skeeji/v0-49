"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Upload, Users, ImageIcon, Video, FileImage, Download } from "lucide-react"
import { UploadForm } from "@/components/UploadForm"

interface ImportResult {
  success: boolean
  message: string
  imported?: number
  processed?: number
  errors?: string[]
  totalErrors?: number
}

export default function ImportPage() {
  const [results, setResults] = useState<Record<string, ImportResult>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [exportingCSV, setExportingCSV] = useState(false)

  const handleCSVUpload = async (file: File) => {
    const key = "csv"
    setLoading({ ...loading, [key]: true })
    setProgress({ ...progress, [key]: 0 })

    try {
      console.log("📥 Début de l'import CSV:", file.name)

      const formData = new FormData()
      formData.append("file", file)

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setProgress((prev) => ({
          ...prev,
          [key]: Math.min((prev[key] || 0) + 10, 90),
        }))
      }, 1000)

      const response = await fetch("/api/upload/csv", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress({ ...progress, [key]: 100 })

      const result = await response.json()
      console.log("📊 Réponse API CSV:", result)

      setResults({ ...results, [key]: result })
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import CSV:", error)
      setResults({
        ...results,
        [key]: {
          success: false,
          message: `Erreur: ${error.message}`,
        },
      })
    } finally {
      setLoading({ ...loading, [key]: false })
    }
  }

  const handleDesignersUpload = async (file: File) => {
    const key = "designers"
    setLoading({ ...loading, [key]: true })
    setProgress({ ...progress, [key]: 0 })

    try {
      console.log("👨‍🎨 Début de l'import designers:", file.name)

      const formData = new FormData()
      formData.append("file", file)

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setProgress((prev) => ({
          ...prev,
          [key]: Math.min((prev[key] || 0) + 15, 90),
        }))
      }, 500)

      const response = await fetch("/api/upload/csv-designers", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress({ ...progress, [key]: 100 })

      const result = await response.json()
      console.log("📊 Réponse API designers:", result)

      setResults({ ...results, [key]: result })
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import designers:", error)
      setResults({
        ...results,
        [key]: {
          success: false,
          message: `Erreur: ${error.message}`,
        },
      })
    } finally {
      setLoading({ ...loading, [key]: false })
    }
  }

  const handleImagesUpload = async (files: File[]) => {
    const key = "images"
    setLoading({ ...loading, [key]: true })
    setProgress({ ...progress, [key]: 0 })

    try {
      console.log("🖼️ Début de l'upload images:", files.length, "fichiers")

      const formData = new FormData()
      files.forEach((file) => {
        formData.append("images", file)
      })

      const progressInterval = setInterval(() => {
        setProgress((prev) => ({
          ...prev,
          [key]: Math.min((prev[key] || 0) + 5, 90),
        }))
      }, 200)

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress({ ...progress, [key]: 100 })

      const result = await response.json()
      console.log("📊 Réponse API images:", result)

      setResults({ ...results, [key]: result })
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload images:", error)
      setResults({
        ...results,
        [key]: {
          success: false,
          message: `Erreur: ${error.message}`,
        },
      })
    } finally {
      setLoading({ ...loading, [key]: false })
    }
  }

  const handleVideoUpload = async (file: File) => {
    const key = "video"
    setLoading({ ...loading, [key]: true })
    setProgress({ ...progress, [key]: 0 })

    try {
      console.log("🎥 Début de l'upload vidéo:", file.name)

      const formData = new FormData()
      formData.append("video", file)

      const progressInterval = setInterval(() => {
        setProgress((prev) => ({
          ...prev,
          [key]: Math.min((prev[key] || 0) + 3, 90),
        }))
      }, 500)

      const response = await fetch("/api/upload/video", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress({ ...progress, [key]: 100 })

      const result = await response.json()
      console.log("📊 Réponse API vidéo:", result)

      setResults({ ...results, [key]: result })
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload vidéo:", error)
      setResults({
        ...results,
        [key]: {
          success: false,
          message: `Erreur: ${error.message}`,
        },
      })
    } finally {
      setLoading({ ...loading, [key]: false })
    }
  }

  const handleLogoUpload = async (file: File) => {
    const key = "logo"
    setLoading({ ...loading, [key]: true })
    setProgress({ ...progress, [key]: 0 })

    try {
      console.log("🏷️ Début de l'upload logo:", file.name)

      const formData = new FormData()
      formData.append("logo", file)

      const progressInterval = setInterval(() => {
        setProgress((prev) => ({
          ...prev,
          [key]: Math.min((prev[key] || 0) + 20, 90),
        }))
      }, 200)

      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress({ ...progress, [key]: 100 })

      const result = await response.json()
      console.log("📊 Réponse API logo:", result)

      setResults({ ...results, [key]: result })
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload logo:", error)
      setResults({
        ...results,
        [key]: {
          success: false,
          message: `Erreur: ${error.message}`,
        },
      })
    } finally {
      setLoading({ ...loading, [key]: false })
    }
  }

  const exportAllLuminaires = async () => {
    setExportingCSV(true)
    try {
      console.log("📊 Export de tous les luminaires...")

      // Récupérer tous les luminaires avec les informations des designers
      const luminairesResponse = await fetch("/api/luminaires?limit=10000")
      const luminairesData = await luminairesResponse.json()

      const designersResponse = await fetch("/api/designers")
      const designersData = await designersResponse.json()

      if (luminairesData.success && designersData.success) {
        // Créer un map des designers pour récupérer rapidement l'image
        const designersMap = new Map()
        designersData.designers.forEach((designer: any) => {
          designersMap.set(designer.nom, designer.imagedesigner || "")
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
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'export:", error)
      alert("Erreur lors de l'export CSV")
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

    setLoading({ ...loading, reset: true })

    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      })

      const result = await response.json()
      console.log("🗑️ Base de données vidée:", result)

      setResults({ reset: result })
    } catch (error: any) {
      console.error("❌ Erreur lors du reset:", error)
      setResults({
        reset: {
          success: false,
          message: `Erreur: ${error.message}`,
        },
      })
    } finally {
      setLoading({ ...loading, reset: false })
    }
  }

  const renderResult = (key: string) => {
    const result = results[key]
    const isLoading = loading[key]
    const currentProgress = progress[key] || 0

    if (isLoading) {
      return (
        <div className="space-y-2">
          <Progress value={currentProgress} className="w-full" />
          <p className="text-sm text-gray-600">Import en cours... {currentProgress}%</p>
        </div>
      )
    }

    if (!result) return null

    return (
      <Alert className={result.success ? "border-green-500" : "border-red-500"}>
        <div className="flex items-center space-x-2">
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription>
            <div className="space-y-1">
              <p>{result.message}</p>
              {result.imported && (
                <p className="text-sm text-gray-600">
                  {result.imported} éléments importés sur {result.processed} traités
                </p>
              )}
              {result.errors && result.errors.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-red-600">
                    {result.totalErrors || result.errors.length} erreurs
                  </summary>
                  <ul className="mt-1 space-y-1 text-red-600">
                    {result.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {result.errors.length > 5 && <li>... et {result.errors.length - 5} autres</li>}
                  </ul>
                </details>
              )}
            </div>
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Import de données</h1>
        <p className="text-gray-600">Importez vos luminaires, designers, images et médias</p>
      </div>

      {/* Bouton d'export CSV */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-600">Export des données</CardTitle>
          <CardDescription>Exportez tous les luminaires avec les informations complètes</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportAllLuminaires} disabled={exportingCSV} className="w-full">
            {exportingCSV ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Export en cours...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exporter tous les luminaires (CSV)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="csv" className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Luminaires</span>
          </TabsTrigger>
          <TabsTrigger value="designers" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Designers</span>
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center space-x-2">
            <ImageIcon className="w-4 h-4" />
            <span>Images</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center space-x-2">
            <Video className="w-4 h-4" />
            <span>Vidéo</span>
          </TabsTrigger>
          <TabsTrigger value="logo" className="flex items-center space-x-2">
            <FileImage className="w-4 h-4" />
            <span>Logo</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle>Import CSV Luminaires</CardTitle>
              <CardDescription>
                Importez votre fichier CSV contenant les données des luminaires (~9000 lignes attendues)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UploadForm
                accept=".csv"
                onUpload={handleCSVUpload}
                type="csv"
                expectedColumns={[
                  "Nom luminaire",
                  "Nom du fichier",
                  "Artiste / Dates",
                  "Spécialité",
                  "Collaboration / Œuvre",
                  "Année",
                  "Signé",
                ]}
              />
              {renderResult("csv")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designers">
          <Card>
            <CardHeader>
              <CardTitle>Import CSV Designers</CardTitle>
              <CardDescription>Importez votre fichier CSV contenant les données des designers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UploadForm
                accept=".csv"
                onUpload={handleDesignersUpload}
                type="csv"
                expectedColumns={["Nom", "imagedesigner"]}
              />
              {renderResult("designers")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Upload Images</CardTitle>
              <CardDescription>Uploadez toutes les images des luminaires (JPG, PNG, GIF, WebP)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UploadForm accept="image/*" onUpload={handleImagesUpload} type="images" multiple />
              {renderResult("images")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video">
          <Card>
            <CardHeader>
              <CardTitle>Upload Vidéo de fond</CardTitle>
              <CardDescription>Uploadez la vidéo de fond pour la page d'accueil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UploadForm accept="video/mp4" onUpload={handleVideoUpload} type="video" />
              {renderResult("video")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logo">
          <Card>
            <CardHeader>
              <CardTitle>Upload Logo</CardTitle>
              <CardDescription>Uploadez le logo de votre site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UploadForm accept="image/*" onUpload={handleLogoUpload} type="logo" />
              {renderResult("logo")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Zone de danger</CardTitle>
          <CardDescription>Actions irréversibles sur la base de données</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={resetDatabase} disabled={loading.reset} variant="destructive" className="w-full">
            {loading.reset ? "Suppression en cours..." : "Vider toute la base de données"}
          </Button>
          {renderResult("reset")}
        </CardContent>
      </Card>
    </div>
  )
}
