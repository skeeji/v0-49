"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Download, FileText, ImageIcon, Users, Video, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

interface Designer {
  _id: string
  nom: string
  imagedesigner?: string
}

export default function ImportPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingDesigners, setUploadingDesigners] = useState(false)
  const [uploadingPeriodImages, setUploadingPeriodImages] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingImages, setExportingImages] = useState(false)
  const [resetting, setResetting] = useState(false)

  const csvFileRef = useRef<HTMLInputElement>(null)
  const imagesFileRef = useRef<HTMLInputElement>(null)
  const designersFileRef = useRef<HTMLInputElement>(null)
  const periodImagesFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)

  const { addToast } = useToast()

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("csv", file)

    try {
      const response = await fetch("/api/upload/csv", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        addToast({
          title: "Succès",
          description: `${result.imported} luminaires importés avec succès`,
          type: "success",
        })
      } else {
        addToast({
          title: "Erreur",
          description: result.error || "Erreur lors de l'importation",
          type: "error",
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors de l'importation du fichier CSV",
        type: "error",
      })
    } finally {
      setUploading(false)
      if (csvFileRef.current) {
        csvFileRef.current.value = ""
      }
    }
  }

  const handleImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    const formData = new FormData()

    Array.from(files).forEach((file) => {
      formData.append("images", file)
    })

    try {
      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        addToast({
          title: "Succès",
          description: `${result.uploaded} images uploadées avec succès`,
          type: "success",
        })
      } else {
        addToast({
          title: "Erreur",
          description: result.error || "Erreur lors de l'upload des images",
          type: "error",
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors de l'upload des images",
        type: "error",
      })
    } finally {
      setUploadingImages(false)
      if (imagesFileRef.current) {
        imagesFileRef.current.value = ""
      }
    }
  }

  const handleDesignersUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingDesigners(true)
    const formData = new FormData()
    formData.append("csv", file)

    try {
      const response = await fetch("/api/upload/csv-designers", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        addToast({
          title: "Succès",
          description: `${result.imported} designers importés avec succès`,
          type: "success",
        })
      } else {
        addToast({
          title: "Erreur",
          description: result.error || "Erreur lors de l'importation des designers",
          type: "error",
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors de l'importation du fichier CSV des designers",
        type: "error",
      })
    } finally {
      setUploadingDesigners(false)
      if (designersFileRef.current) {
        designersFileRef.current.value = ""
      }
    }
  }

  const handlePeriodImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingPeriodImages(true)
    const formData = new FormData()

    Array.from(files).forEach((file) => {
      formData.append("images", file)
    })

    try {
      const response = await fetch("/api/upload/period-images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        addToast({
          title: "Succès",
          description: `${result.uploaded} images de période uploadées avec succès`,
          type: "success",
        })
      } else {
        addToast({
          title: "Erreur",
          description: result.error || "Erreur lors de l'upload des images de période",
          type: "error",
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors de l'upload des images de période",
        type: "error",
      })
    } finally {
      setUploadingPeriodImages(false)
      if (periodImagesFileRef.current) {
        periodImagesFileRef.current.value = ""
      }
    }
  }

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingVideo(true)
    const formData = new FormData()
    formData.append("video", file)

    try {
      const response = await fetch("/api/upload/video", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        addToast({
          title: "Succès",
          description: "Vidéo uploadée avec succès",
          type: "success",
        })
      } else {
        addToast({
          title: "Erreur",
          description: result.error || "Erreur lors de l'upload de la vidéo",
          type: "error",
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors de l'upload de la vidéo",
        type: "error",
      })
    } finally {
      setUploadingVideo(false)
      if (videoFileRef.current) {
        videoFileRef.current.value = ""
      }
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    const formData = new FormData()
    formData.append("logo", file)

    try {
      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        addToast({
          title: "Succès",
          description: "Logo uploadé avec succès",
          type: "success",
        })
      } else {
        addToast({
          title: "Erreur",
          description: result.error || "Erreur lors de l'upload du logo",
          type: "error",
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors de l'upload du logo",
        type: "error",
      })
    } finally {
      setUploadingLogo(false)
      if (logoFileRef.current) {
        logoFileRef.current.value = ""
      }
    }
  }

  const exportAllLuminaires = async () => {
    setExportingCSV(true)
    try {
      // Récupération des données des luminaires
      const luminairesResponse = await fetch("/api/luminaires?limit=10000")
      const luminairesData = await luminairesResponse.json()

      // Récupération des données des designers
      const designersResponse = await fetch("/api/designers-data")
      const designersData = await designersResponse.json()

      if (!luminairesData.success || !designersData.success) {
        throw new Error("Erreur lors de la récupération des données")
      }

      const luminaires = luminairesData.luminaires
      const designers = designersData.designers

      // Créer une map des designers pour un accès rapide
      const designersMap = new Map<string, Designer>()
      designers.forEach((designer: Designer) => {
        designersMap.set(designer.nom, designer)
      })

      // Créer le classeur Excel
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Luminaires")

      // Définir les colonnes selon la structure demandée
      worksheet.columns = [
        { header: "Image Luminaire", key: "imgLuminaire", width: 25 },
        { header: "Image Designer", key: "imgDesigner", width: 25 },
        { header: "Nom luminaire", key: "nom", width: 35 },
        { header: "Artiste / Dates", key: "designer", width: 35 },
        { header: "Année", key: "annee", width: 10 },
        { header: "Spécialité", key: "specialite", width: 25 },
        { header: "Description", key: "description", width: 50 },
        { header: "Matériaux", key: "materiaux", width: 40 },
        { header: "Dimensions", key: "dimensions", width: 30 },
        { header: "Editeur", key: "editeur", width: 30 },
        { header: "Estimation", key: "estimation", width: 20 },
        { header: "Collaboration/œuvre", key: "collaboration", width: 40 },
        { header: "Signé", key: "signe", width: 15 },
      ]

      // Remplir les données avec images
      for (const luminaire of luminaires) {
        let luminaireImageId = null
        let designerImageId = null

        // Récupérer l'image du luminaire
        if (luminaire.filename) {
          try {
            const imageResponse = await fetch(`/api/images/filename/${luminaire.filename}`)
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer()
              luminaireImageId = workbook.addImage({
                buffer: imageBuffer,
                extension: "jpeg",
              })
            }
          } catch (error) {
            console.log(`Image luminaire non trouvée: ${luminaire.filename}`)
          }
        }

        // Récupérer l'image du designer
        const designer = designersMap.get(luminaire.designer || "")
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
            console.log(`Image designer non trouvée: ${designer.imagedesigner}`)
          }
        }

        // Ajouter la ligne de données
        const row = worksheet.addRow({
          nom: luminaire.nom || "",
          designer: luminaire.designer || "",
          annee: luminaire.annee || "",
          specialite: luminaire.periode || luminaire.specialite || "",
          description: luminaire.description || "",
          materiaux: Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join(", ") : luminaire.materiaux || "",
          dimensions: luminaire.dimensions || "",
          editeur: luminaire.editeur || "",
          estimation: luminaire.estimation || luminaire.prix || "",
          collaboration: luminaire.collaboration || luminaire.oeuvre || "",
          signe: luminaire.signe || "",
        })

        // Définir la hauteur de la ligne pour les images
        row.height = 100

        // Ajouter les images aux cellules
        if (luminaireImageId) {
          worksheet.addImage(luminaireImageId, `A${row.number}:A${row.number}`)
        }
        if (designerImageId) {
          worksheet.addImage(designerImageId, `B${row.number}:B${row.number}`)
        }
      }

      // Générer le fichier Excel
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // Télécharger le fichier
      saveAs(blob, `Export_Luminaires_${new Date().toISOString().split("T")[0]}.xlsx`)

      addToast({
        title: "Succès",
        description: `Export Excel généré avec ${luminaires.length} luminaires`,
        type: "success",
      })
    } catch (error) {
      console.error("Erreur lors de l'export Excel:", error)
      addToast({
        title: "Erreur",
        description: "Erreur lors de l'export Excel",
        type: "error",
      })
    } finally {
      setExportingCSV(false)
    }
  }

  const exportAllImages = async () => {
    setExportingImages(true)
    try {
      const response = await fetch("/api/export/images")

      if (!response.ok) {
        throw new Error("Erreur lors de l'export des images")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `images-export-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addToast({
        title: "Succès",
        description: "Export des images terminé",
        type: "success",
      })
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors de l'export des images",
        type: "error",
      })
    } finally {
      setExportingImages(false)
    }
  }

  const resetDatabase = async () => {
    if (!confirm("Êtes-vous sûr de vouloir réinitialiser la base de données ? Cette action est irréversible.")) {
      return
    }

    setResetting(true)
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      })

      const result = await response.json()

      if (response.ok) {
        addToast({
          title: "Succès",
          description: "Base de données réinitialisée avec succès",
          type: "success",
        })
      } else {
        addToast({
          title: "Erreur",
          description: result.error || "Erreur lors de la réinitialisation",
          type: "error",
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors de la réinitialisation de la base de données",
        type: "error",
      })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import / Export</h1>
        <p className="text-gray-600">Gérez vos données et fichiers</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Import CSV Luminaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import CSV Luminaires
            </CardTitle>
            <CardDescription>Importez vos luminaires depuis un fichier CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Fichier CSV</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  ref={csvFileRef}
                  onChange={handleCSVUpload}
                  disabled={uploading}
                />
              </div>
              <Button onClick={() => csvFileRef.current?.click()} disabled={uploading} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Import en cours..." : "Sélectionner et importer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Import Images
            </CardTitle>
            <CardDescription>Uploadez vos images de luminaires</CardDescription>
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
                  ref={imagesFileRef}
                  onChange={handleImagesUpload}
                  disabled={uploadingImages}
                />
              </div>
              <Button onClick={() => imagesFileRef.current?.click()} disabled={uploadingImages} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                {uploadingImages ? "Upload en cours..." : "Sélectionner et uploader"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import CSV Designers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Import CSV Designers
            </CardTitle>
            <CardDescription>Importez vos designers depuis un fichier CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="designers-file">Fichier CSV Designers</Label>
                <Input
                  id="designers-file"
                  type="file"
                  accept=".csv"
                  ref={designersFileRef}
                  onChange={handleDesignersUpload}
                  disabled={uploadingDesigners}
                />
              </div>
              <Button
                onClick={() => designersFileRef.current?.click()}
                disabled={uploadingDesigners}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingDesigners ? "Import en cours..." : "Sélectionner et importer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import Images de Période */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Import Images de Période
            </CardTitle>
            <CardDescription>Uploadez vos images pour la chronologie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="period-images-file">Images de Période</Label>
                <Input
                  id="period-images-file"
                  type="file"
                  accept="image/*"
                  multiple
                  ref={periodImagesFileRef}
                  onChange={handlePeriodImagesUpload}
                  disabled={uploadingPeriodImages}
                />
              </div>
              <Button
                onClick={() => periodImagesFileRef.current?.click()}
                disabled={uploadingPeriodImages}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingPeriodImages ? "Upload en cours..." : "Sélectionner et uploader"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import Vidéo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Import Vidéo d'Accueil
            </CardTitle>
            <CardDescription>Uploadez votre vidéo d'accueil</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="video-file">Vidéo (MP4, WebM, AVI)</Label>
                <Input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  ref={videoFileRef}
                  onChange={handleVideoUpload}
                  disabled={uploadingVideo}
                />
              </div>
              <Button onClick={() => videoFileRef.current?.click()} disabled={uploadingVideo} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                {uploadingVideo ? "Upload en cours..." : "Sélectionner et uploader"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Import Logo
            </CardTitle>
            <CardDescription>Uploadez votre logo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo-file">Logo (PNG, SVG, JPG)</Label>
                <Input
                  id="logo-file"
                  type="file"
                  accept="image/*"
                  ref={logoFileRef}
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
              </div>
              <Button onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                {uploadingLogo ? "Upload en cours..." : "Sélectionner et uploader"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Export */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Export</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Button
            onClick={exportAllLuminaires}
            disabled={exportingCSV}
            variant="outline"
            className="h-20 bg-transparent"
          >
            <Download className="h-5 w-5 mr-2" />
            {exportingCSV ? "Export en cours..." : "Exporter tous les luminaires (Excel)"}
          </Button>

          <Button
            onClick={exportAllImages}
            disabled={exportingImages}
            variant="outline"
            className="h-20 bg-transparent"
          >
            <Download className="h-5 w-5 mr-2" />
            {exportingImages ? "Export en cours..." : "Exporter toutes les images (ZIP)"}
          </Button>

          <Button onClick={resetDatabase} disabled={resetting} variant="destructive" className="h-20">
            <Trash2 className="h-5 w-5 mr-2" />
            {resetting ? "Réinitialisation..." : "Réinitialiser la base de données"}
          </Button>
        </div>
      </div>
    </div>
  )
}
