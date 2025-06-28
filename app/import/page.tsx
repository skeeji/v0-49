"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Upload, FileText, Users, ImageIcon, Video, Settings } from "lucide-react"
import { useToast } from "@/hooks/useToast"

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadType, setUploadType] = useState<string | null>(null)
  const { toast } = useToast()

  const handleFileUpload = async (file: File, endpoint: string, type: string) => {
    if (!file) return

    setIsUploading(true)
    setUploadType(type)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Import réussi",
          description: result.message,
        })
      } else {
        toast({
          title: "❌ Erreur d'import",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erreur upload:", error)
      toast({
        title: "❌ Erreur",
        description: "Erreur lors de l'upload du fichier",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadType(null)
    }
  }

  const handleCSVDesignersUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file, "/api/upload/csv-designers", "csv-designers")
    }
  }

  const handleCSVLuminairesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file, "/api/upload/csv", "csv-luminaires")
    }
  }

  const handleImagesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append("files", file)
      })

      setIsUploading(true)
      setUploadType("images")

      fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((result) => {
          if (result.success) {
            toast({
              title: "✅ Images importées",
              description: `${result.uploadedCount} images importées avec succès`,
            })
          } else {
            toast({
              title: "❌ Erreur d'import",
              description: result.error,
              variant: "destructive",
            })
          }
        })
        .catch((error) => {
          console.error("Erreur upload images:", error)
          toast({
            title: "❌ Erreur",
            description: "Erreur lors de l'upload des images",
            variant: "destructive",
          })
        })
        .finally(() => {
          setIsUploading(false)
          setUploadType(null)
        })
    }
  }

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file, "/api/upload/video", "video")
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file, "/api/upload/logo", "logo")
    }
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-playfair text-dark mb-4">Import de données</h1>
          <p className="text-gray-600">
            Importez vos fichiers CSV, images, vidéos et logo pour alimenter la base de données.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CSV Designers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                CSV Designers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Importez le fichier CSV contenant les informations des designers (Nom, imagedesigner).
              </p>
              <div className="space-y-4">
                <Input type="file" accept=".csv" onChange={handleCSVDesignersUpload} disabled={isUploading} />
                <Button
                  onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                  disabled={isUploading && uploadType === "csv-designers"}
                  className="w-full"
                >
                  {isUploading && uploadType === "csv-designers" ? (
                    "Import en cours..."
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importer CSV Designers
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CSV Luminaires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                CSV Luminaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Importez le fichier CSV contenant les informations des luminaires.
              </p>
              <div className="space-y-4">
                <Input type="file" accept=".csv" onChange={handleCSVLuminairesUpload} disabled={isUploading} />
                <Button
                  onClick={() => {
                    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
                    inputs[1]?.click()
                  }}
                  disabled={isUploading && uploadType === "csv-luminaires"}
                  className="w-full"
                >
                  {isUploading && uploadType === "csv-luminaires" ? (
                    "Import en cours..."
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importer CSV Luminaires
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Importez les images des luminaires et des designers (JPG, PNG, WebP).
              </p>
              <div className="space-y-4">
                <Input type="file" accept="image/*" multiple onChange={handleImagesUpload} disabled={isUploading} />
                <Button
                  onClick={() => {
                    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
                    inputs[2]?.click()
                  }}
                  disabled={isUploading && uploadType === "images"}
                  className="w-full"
                >
                  {isUploading && uploadType === "images" ? (
                    "Import en cours..."
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importer Images
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vidéo de bienvenue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Vidéo de bienvenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Importez la vidéo de bienvenue qui sera affichée sur la page d'accueil.
              </p>
              <div className="space-y-4">
                <Input type="file" accept="video/*" onChange={handleVideoUpload} disabled={isUploading} />
                <Button
                  onClick={() => {
                    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
                    inputs[3]?.click()
                  }}
                  disabled={isUploading && uploadType === "video"}
                  className="w-full"
                >
                  {isUploading && uploadType === "video" ? (
                    "Import en cours..."
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importer Vidéo
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Logo du site
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Importez le logo qui remplacera "GERSAINT PARIS" dans le header du site.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                </div>
                <Button
                  onClick={() => {
                    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
                    inputs[4]?.click()
                  }}
                  disabled={isUploading && uploadType === "logo"}
                  className="sm:w-auto"
                >
                  {isUploading && uploadType === "logo" ? (
                    "Import en cours..."
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importer Logo
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Instructions d'import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">CSV Designers :</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Colonne 1 "Nom" : Nom du designer</li>
                <li>• Colonne 2 "imagedesigner" : Nom du fichier image (ex: portrait.jpg)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">CSV Luminaires :</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Doit contenir les colonnes : nom, designer, annee, etc.</li>
                <li>• Colonne "Nom du fichier" : Nom du fichier image du luminaire</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Images :</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Formats supportés : JPG, PNG, WebP</li>
                <li>• Les noms des fichiers doivent correspondre aux CSV</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
