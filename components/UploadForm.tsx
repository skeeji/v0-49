"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Users, ImageIcon, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UploadResult {
  success: boolean
  message: string
  imported?: number
  processed?: number
  uploaded?: number
  associated?: number
  remaining?: number
  errors?: string[]
}

export function UploadForm() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [results, setResults] = useState<{
    csv?: UploadResult
    designers?: UploadResult
    images?: UploadResult[]
  }>({})

  const csvFileRef = useRef<HTMLInputElement>(null)
  const designersFileRef = useRef<HTMLInputElement>(null)
  const imagesFileRef = useRef<HTMLInputElement>(null)

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

    console.log(`📁 Fichier CSV sélectionné: ${file.name}, taille: ${file.size} bytes`)

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

    const allResults: UploadResult[] = []

    try {
      // CORRECTION: Traiter par très petits batches de 50 fichiers
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload CSV Luminaires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
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
                      <AlertCircle className="w-4 h-4" />
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
                      <AlertCircle className="w-4 h-4" />
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
                          <AlertCircle className="w-4 h-4" />
                          <span>Batch {index + 1}: Erreur</span>
                        </div>
                      )}
                    </div>
                  ))}
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
  )
}
