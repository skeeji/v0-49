"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Upload, Users, ImageIcon, Video, FileImage, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ImportResult {
  success: boolean
  message: string
  imported?: number
  processed?: number
  uploaded?: number
  associated?: number
  errors?: string[]
  totalErrors?: number
}

export default function ImportPage() {
  const [results, setResults] = useState<Record<string, ImportResult>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState<Record<string, number>>({})

  // Refs pour les inputs
  const csvFileRef = useRef<HTMLInputElement>(null)
  const designersFileRef = useRef<HTMLInputElement>(null)
  const imagesFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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

  const handleDesignersUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const key = "designers"
    setLoading({ ...loading, [key]: true })
    setProgress({ ...progress, [key]: 0 })

    try {
      console.log("👨‍🎨 Début de l'import designers:", file.name)

      const formData = new FormData()
      formData.append("file", file)

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

  const handleImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

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

      if (result.success) {
        toast({
          title: "✅ Images uploadées",
          description: result.message,
        })
      } else {
        toast({
          title: "❌ Erreur images",
          description: result.error,
          variant: "destructive",
        })
      }
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

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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

      if (result.success) {
        toast({
          title: "✅ Base de données vidée",
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
              {result.uploaded && (
                <p className="text-sm text-gray-600">
                  {result.uploaded} fichiers uploadés, {result.associated} associés
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
        <h1 className="text-4xl font-serif text-gray-900">Import de données</h1>
        <p className="text-lg text-gray-600">Importez vos luminaires, designers, images et médias</p>
      </div>

      {/* Grille d'import */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CSV Luminaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-blue-500" />
              <span>CSV Luminaires</span>
            </CardTitle>
            <CardDescription>Importez votre fichier CSV contenant les données des luminaires</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input ref={csvFileRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            <Button
              onClick={() => csvFileRef.current?.click()}
              disabled={loading.csv}
              className="w-full"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Sélectionner CSV
            </Button>
            {renderResult("csv")}
          </CardContent>
        </Card>

        {/* CSV Designers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-500" />
              <span>CSV Designers</span>
            </CardTitle>
            <CardDescription>Importez votre fichier CSV contenant les données des designers</CardDescription>
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
              disabled={loading.designers}
              className="w-full"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Sélectionner CSV
            </Button>
            {renderResult("designers")}
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-green-500" />
              <span>Images</span>
            </CardTitle>
            <CardDescription>Uploadez toutes les images des luminaires</CardDescription>
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
              disabled={loading.images}
              className="w-full"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Sélectionner Images
            </Button>
            {renderResult("images")}
          </CardContent>
        </Card>

        {/* Vidéo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-red-500" />
              <span>Vidéo de fond</span>
            </CardTitle>
            <CardDescription>Uploadez la vidéo de fond pour la page d'accueil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input ref={videoFileRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
            <Button
              onClick={() => videoFileRef.current?.click()}
              disabled={loading.video}
              className="w-full"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Sélectionner Vidéo
            </Button>
            {renderResult("video")}
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileImage className="w-5 h-5 text-orange-500" />
              <span>Logo</span>
            </CardTitle>
            <CardDescription>Uploadez le logo de votre site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input ref={logoFileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <Button
              onClick={() => logoFileRef.current?.click()}
              disabled={loading.logo}
              className="w-full"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Sélectionner Logo
            </Button>
            {renderResult("logo")}
          </CardContent>
        </Card>

        {/* Reset Database */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              <span>Zone de danger</span>
            </CardTitle>
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
    </div>
  )
}
