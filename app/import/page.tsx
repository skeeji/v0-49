"use client"

import type React from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Database, UploadIcon, Video, ImageIcon } from "lucide-react"
import { useState, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

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
  const [isResetting, setIsResetting] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const csvFileRef = useRef<HTMLInputElement>(null)
  const designersFileRef = useRef<HTMLInputElement>(null)
  const imagesFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)
  const periodImageFileRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const { userData } = useAuth()
  const router = useRouter()

  // Vérifier si l'utilisateur est admin
  if (userData?.role !== "admin") {
    router.push("/")
    return null
  }

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
        alert("CSV importé avec succès")
      } else {
        alert("Erreur lors de l'import CSV")
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import CSV:", error)
      alert("Erreur lors de l'import CSV")
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
        alert("Designers importés avec succès")
      } else {
        alert("Erreur lors de l'import designers")
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import designers:", error)
      alert("Erreur lors de l'import designers")
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

      alert(`${totalUploaded} images uploadées, ${totalAssociated} associées`)
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload images:", error)
      alert("Erreur lors de l'upload images")
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
        alert("Vidéo uploadée avec succès")
      } else {
        alert("Erreur lors de l'upload vidéo")
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload vidéo:", error)
      alert("Erreur lors de l'upload vidéo")
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
        alert("Logo uploadé avec succès")
        window.location.reload()
      } else {
        alert("Erreur lors de l'upload logo")
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload logo:", error)
      alert("Erreur lors de l'upload logo")
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
        alert(`${selectedPeriod}: Image uploadée avec succès`)
        setSelectedPeriod("")
      } else {
        alert(`${selectedPeriod}: Erreur lors de l'upload image`)
      }
    } catch (error: any) {
      console.error("❌ Erreur critique upload image période:", error)
      alert("Erreur lors de l'upload image")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentStep("")
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
        alert(`${csvData.length} luminaires exportés`)
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'export:", error)
      alert("Erreur lors de l'export CSV")
    } finally {
      setExportingCSV(false)
    }
  }

  const handleReset = async () => {
    if (!confirm("Êtes-vous sûr de vouloir réinitialiser toute la base de données ? Cette action est irréversible.")) {
      return
    }

    setIsResetting(true)
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      })

      const result = await response.json()
      if (result.success) {
        alert("Base de données réinitialisée avec succès")
        window.location.reload()
      } else {
        alert("Erreur lors de la réinitialisation")
      }
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la réinitialisation")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-gray-900 mb-4">Administration</h1>
          <p className="text-gray-600">Gestion des données et des médias du site</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Upload Vidéo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Vidéo d'accueil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Uploadez une vidéo qui sera affichée en arrière-plan de la page d'accueil
              </p>
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
              <Button
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploadingVideo}
                className="w-full text-white transition-all duration-200"
                style={{ backgroundColor: "#d4a574" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#c19660")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#d4a574")}
              >
                {isUploadingVideo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4 mr-2" />
                    Choisir une vidéo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Upload Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Logo du site
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Uploadez un logo qui sera affiché dans le header du site</p>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <Button
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="w-full text-white transition-all duration-200"
                style={{ backgroundColor: "#d4a574" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#c19660")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#d4a574")}
              >
                {isUploadingLogo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4 mr-2" />
                    Choisir un logo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Formulaire d'upload principal */}
        <UploadForm />

        {/* Zone de danger */}
        <Card className="mt-8 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Zone de danger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Cette action supprimera toutes les données de la base de données. Cette action est irréversible.
            </p>
            <Button
              onClick={handleReset}
              disabled={isResetting}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              {isResetting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                  Réinitialisation...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Réinitialiser la base de données
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
