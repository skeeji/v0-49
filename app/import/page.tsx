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

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 2
      } else {
        inQuotes = !inQuotes
        i++
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
      i++
    } else {
      current += char
      i++
    }
  }

  result.push(current.trim())
  return result
}

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [results, setResults] = useState<{
    csv?: ImportResult
    designers?: ImportResult
    images?: ImportResult[]
    designerImages?: ImportResult[]
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
  const designerImagesFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)
  const periodImageFileRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log(`📁 Fichier CSV sélectionné: ${file.name}, taille: ${file.size} bytes`)

    setIsUploading(true)
    setCurrentStep("Lecture du CSV...")
    setUploadProgress(5)

    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length === 0) {
        throw new Error("Fichier CSV vide")
      }

      const headers = parseCSVLine(lines[0])
      console.log("📋 En-têtes détectés:", headers)

      const CHUNK_SIZE = 50
      const dataLines = lines.slice(1)
      const chunks = []

      for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
        const chunkLines = dataLines.slice(i, i + CHUNK_SIZE)
        const chunkData = chunkLines.map((line) => parseCSVLine(line))
        chunks.push(chunkData)
      }

      console.log(`📦 ${chunks.length} chunks de ${CHUNK_SIZE} lignes créés`)

      let totalImported = 0
      let totalProcessed = 0
      const allErrors: string[] = []

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        setCurrentStep(`Import chunk ${chunkIndex + 1}/${chunks.length}...`)
        setUploadProgress(10 + (chunkIndex / chunks.length) * 80)

        try {
          const response = await fetch("/api/upload/csv-stream", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              csvData: chunks[chunkIndex],
              chunkIndex,
              totalChunks: chunks.length,
              headers,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Erreur chunk ${chunkIndex + 1}: ${response.status} - ${errorText}`)
          }

          const result = await response.json()

          if (result.success) {
            totalImported += result.imported || 0
            totalProcessed += result.processed || 0
            if (result.errors) {
              allErrors.push(...result.errors)
            }
            console.log(`✅ Chunk ${chunkIndex + 1}: ${result.imported} importés`)
          } else {
            throw new Error(result.error)
          }

          if (chunkIndex < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        } catch (chunkError: any) {
          console.error(`❌ Erreur chunk ${chunkIndex + 1}:`, chunkError)
          allErrors.push(`Chunk ${chunkIndex + 1}: ${chunkError.message}`)
        }
      }

      const finalResult = {
        success: totalImported > 0,
        message: `Import terminé: ${totalImported} luminaires importés sur ${totalProcessed} lignes traitées`,
        imported: totalImported,
        processed: totalProcessed,
        errors: allErrors.slice(0, 20),
        totalErrors: allErrors.length,
      }

      setResults((prev) => ({ ...prev, csv: finalResult }))

      if (totalImported > 0) {
        toast({
          title: "✅ CSV importé",
          description: finalResult.message,
        })
      } else {
        toast({
          title: "❌ Erreur CSV",
          description: "Aucun luminaire importé",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'import CSV:", error)
      toast({
        title: "❌ Erreur critique",
        description: `Impossible d'importer le CSV: ${error.message}`,
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

    let totalUploaded = 0
    let totalAssociated = 0
    let totalSkipped = 0
    const errors: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentStep(`Upload ${i + 1}/${files.length}: ${file.name}`)
        setUploadProgress(5 + (i / files.length) * 90)

        try {
          console.log(`📁 Upload ${i + 1}/${files.length}: ${file.name} (${Math.round(file.size / 1024)}KB)`)

          const formData = new FormData()
          formData.append("image", file)
          formData.append("isDesignerImage", "false")

          const response = await fetch("/api/upload/single-image", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Erreur ${response.status}: ${errorText}`)
          }

          const result = await response.json()

          if (result.success) {
            if (result.skipped) {
              totalSkipped++
            } else {
              totalUploaded += result.uploaded || 0
            }
            totalAssociated += result.associated || 0
            console.log(`✅ ${file.name}: ${result.skipped ? "déjà existant" : "uploadé"}`)
          } else {
            throw new Error(result.error)
          }

          if (i < files.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300))
          }
        } catch (fileError: any) {
          const errorMsg = `Erreur ${file.name}: ${fileError.message}`
          errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      const finalResult = {
        success: true,
        message: `Upload terminé: ${totalUploaded} nouvelles images, ${totalSkipped} déjà existantes, ${totalAssociated} associées`,
        uploaded: totalUploaded,
        associated: totalAssociated,
        processed: files.length,
        errors: errors.slice(0, 10),
        totalErrors: errors.length,
      }

      setResults((prev) => ({ ...prev, images: [finalResult] }))

      toast({
        title: "✅ Upload terminé",
        description: finalResult.message,
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

  const handleDesignerImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    console.log(`👤 Début de l'upload images designers: ${files.length} fichiers`)

    setIsUploading(true)
    setCurrentStep("Upload des images designers...")
    setUploadProgress(5)

    let totalUploaded = 0
    let totalSkipped = 0
    const errors: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentStep(`Upload designer ${i + 1}/${files.length}: ${file.name}`)
        setUploadProgress(5 + (i / files.length) * 90)

        try {
          console.log(`👤 Upload ${i + 1}/${files.length}: ${file.name} (${Math.round(file.size / 1024)}KB)`)

          const formData = new FormData()
          formData.append("image", file)
          formData.append("isDesignerImage", "true")

          const response = await fetch("/api/upload/single-image", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Erreur ${response.status}: ${errorText}`)
          }

          const result = await response.json()

          if (result.success) {
            if (result.skipped) {
              totalSkipped++
            } else {
              totalUploaded += result.uploaded || 0
            }
            console.log(`✅ Designer ${file.name}: ${result.skipped ? "déjà existant" : "uploadé"}`)
          } else {
            throw new Error(result.error)
          }

          if (i < files.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300))
          }
        } catch (fileError: any) {
          const errorMsg = `Erreur ${file.name}: ${fileError.message}`
          errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      const finalResult = {
        success: true,
        message: `Upload designers terminé: ${totalUploaded} nouvelles images, ${totalSkipped} déjà existantes`,
        uploaded: totalUploaded,
        processed: files.length,
        errors: errors.slice(0, 10),
        totalErrors: errors.length,
      }

      setResults((prev) => ({ ...prev, designerImages: [finalResult] }))

      toast({
        title: "✅ Upload designers terminé",
        description: finalResult.message,
      })
    } catch (error: any) {
      console.error("❌ Erreur critique lors de l'upload images designers:", error)
      toast({
        title: "❌ Erreur critique",
        description: "Impossible d'uploader les images designers",
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

    if (!file.type.startsWith("video/")) {
      toast({
        title: "❌ Erreur vidéo",
        description: "Le fichier doit être une vidéo",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setCurrentStep("Préparation de l'upload vidéo...")
    setUploadProgress(5)

    try {
      console.log("🎥 Début de l'upload vidéo par chunks:", file.name)

      const CHUNK_SIZE = 100 * 1024
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

      console.log(`📦 Upload par chunks: ${totalChunks} chunks de 100KB`)

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)

        setCurrentStep(`Upload chunk ${chunkIndex + 1}/${totalChunks}...`)
        setUploadProgress(10 + (chunkIndex / totalChunks) * 80)

        const formData = new FormData()
        formData.append("chunk", chunk)
        formData.append("chunkIndex", chunkIndex.toString())
        formData.append("totalChunks", totalChunks.toString())
        formData.append("fileName", file.name)
        formData.append("fileType", file.type)

        const response = await fetch("/api/upload/video-chunks", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Erreur ${response.status}: ${errorText}`)
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error)
        }

        console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploadé`)

        if (chunkIndex < totalChunks - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      setCurrentStep("Vidéo uploadée avec succès !")
      setUploadProgress(100)

      setResults((prev) => ({
        ...prev,
        video: {
          success: true,
          message: "Vidéo uploadée avec succès",
        },
      }))

      toast({
        title: "✅ Vidéo uploadée",
        description: "La vidéo de fond a été uploadée avec succès",
      })

      console.log("✅ Upload vidéo terminé avec succès")
    } catch (error: any) {
      console.error("❌ Erreur lors de l'upload vidéo:", error)

      setResults((prev) => ({
        ...prev,
        video: {
          success: false,
          message: error.message,
        },
      }))

      toast({
        title: "❌ Erreur vidéo",
        description: `Impossible d'uploader la vidéo: ${error.message}`,
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
      console.log("📊 Export de tous les luminaires...")

      // CORRECTION: Récupérer TOUS les luminaires sans limite
      const luminairesResponse = await fetch("/api/luminaires?limit=100000")
      const luminairesData = await luminairesResponse.json()

      const designersResponse = await fetch("/api/designers-data")
      const designersData = await designersResponse.json()

      if (luminairesData.success && designersData.success) {
        const designersMap = new Map()
        designersData.designers.forEach((designer: any) => {
          designersMap.set(designer.Nom || designer.nom, designer)
        })

        console.log(`🔍 Export de ${luminairesData.luminaires.length} luminaires...`)

        const csvData = luminairesData.luminaires.map((luminaire: any, index: number) => {
          const designerName = luminaire.designer || luminaire["Artiste / Dates"] || ""
          const designer = designersMap.get(designerName)
          const designerImageFilename = luminaire.designerImageFilename || (designer && designer.imagedesigner) || ""

          const specialite = luminaire.periode || luminaire.specialite || luminaire["Spécialité"] || ""
          const collaboration = luminaire.collaboration || luminaire["Collaboration / Œuvre"] || ""
          const categorie = luminaire.categorie || luminaire["Catégorie"] || ""

          // CORRECTION: Gestion unifiée des matériaux pour l'export
          let materiaux = ""
          if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
            materiaux = luminaire.materiaux.join("; ")
          } else if (luminaire.Matériaux) {
            if (typeof luminaire.Matériaux === "string" && luminaire.Matériaux.trim() !== "") {
              materiaux = luminaire.Matériaux.trim()
            } else if (Array.isArray(luminaire.Matériaux)) {
              materiaux = luminaire.Matériaux.join("; ")
            }
          }

          const lienSiteMarchand = luminaire.lienSiteMarchand || luminaire["Lien site marchand"] || ""
          const etiquette = luminaire.etiquette || luminaire["Etiquette"] || ""
          const bibliographie = luminaire.bibliographie || luminaire["Bibliographie"] || ""

          return {
            Signé: luminaire.signe || luminaire["Signé"] || "",
            "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
            "Artiste / Dates": designerName,
            Année: luminaire.annee || luminaire["Année"] || "",
            Catégorie: categorie,
            Editeur: luminaire.editeur || luminaire["Editeur"] || "",
            Spécialité: specialite,
            "Collaboration / Œuvre": collaboration,
            Description: luminaire.description || luminaire["Description"] || "",
            Matériaux: materiaux,
            Dimensions: luminaire.dimensions || luminaire["Dimensions"] || "",
            Estimation: luminaire.estimation || luminaire.prix || luminaire["Estimation"] || "",
            "Image luminaire (Nom du fichier)": luminaire.filename || luminaire["Nom du fichier"] || "",
            "Image designer (imagedesigner)": designerImageFilename,
            "Lien site marchand": lienSiteMarchand,
            Etiquette: etiquette,
            Bibliographie: bibliographie,
          }
        })

        const headers = [
          "Signé",
          "Nom luminaire",
          "Artiste / Dates",
          "Année",
          "Catégorie",
          "Editeur",
          "Spécialité",
          "Collaboration / Œuvre",
          "Description",
          "Matériaux",
          "Dimensions",
          "Estimation",
          "Image luminaire (Nom du fichier)",
          "Image designer (imagedesigner)",
          "Lien site marchand",
          "Etiquette",
          "Bibliographie",
        ]

        const csvContent = [
          headers.join(","),
          ...csvData.map((row) =>
            headers
              .map((header) => {
                const value = row[header] || ""
                const escapedValue = String(value).replace(/"/g, '""')
                return `"${escapedValue}"`
              })
              .join(","),
          ),
        ].join("\n")

        const materiauxCount = csvData.filter((row) => row["Matériaux"] && row["Matériaux"] !== "").length
        const lienSiteMarchandCount = csvData.filter(
          (row) => row["Lien site marchand"] && row["Lien site marchand"] !== "",
        ).length
        const etiquetteCount = csvData.filter((row) => row["Etiquette"] && row["Etiquette"] !== "").length
        const bibliographieCount = csvData.filter((row) => row["Bibliographie"] && row["Bibliographie"] !== "").length

        console.log(`📊 Matériaux remplis: ${materiauxCount}/${csvData.length} luminaires`)
        console.log(`📊 Lien site marchand: ${lienSiteMarchandCount}/${csvData.length} luminaires`)
        console.log(`📊 Etiquette: ${etiquetteCount}/${csvData.length} luminaires`)
        console.log(`📊 Bibliographie: ${bibliographieCount}/${csvData.length} luminaires`)

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `luminaires_export_${new Date().toISOString().split("T")[0]}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

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

  const exportAllImages = async () => {
    setExportingImages(true)
    try {
      console.log("📦 Export de toutes les images...")

      const response = await fetch("/api/export/images", {
        method: "GET",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Erreur réponse serveur:", errorText)
        throw new Error(`Erreur serveur: ${response.status} - ${errorText}`)
      }

      const blob = await response.blob()
      console.log(`📦 Blob reçu: ${blob.size} bytes, type: ${blob.type}`)

      if (blob.size === 0) {
        throw new Error("Le fichier ZIP reçu est vide")
      }

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `images_export_${new Date().toISOString().split("T")[0]}.zip`
      link.style.display = "none"
      document.body.appendChild(link)

      console.log("📥 Déclenchement du téléchargement...")
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
        description: `Erreur lors de l'export des images: ${error.message}`,
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
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>🚀 Nouvelle version optimisée :</strong> CSV par streaming, images une par une (max 5MB chacune)
              </p>
            </div>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Download className="w-4 h-4 mr-2" />
                      Exporter tous les luminaires (CSV)
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
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Upload className="w-5 h-5" />
                  CSV Luminaires
                </CardTitle>
                <CardDescription>🚀 Streaming par chunks (toute taille)</CardDescription>
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

            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <ImageIcon className="w-5 h-5" />
                  Images
                </CardTitle>
                <CardDescription>🚀 Une par une (max 5MB chacune)</CardDescription>
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
                  <div className="text-sm">
                    {results.images[0].success ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          {results.images[0].uploaded} uploadées, {results.images[0].associated} associées
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span>Erreur upload</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Users className="w-5 h-5" />
                  Images Designers
                </CardTitle>
                <CardDescription>🚀 Une par une (max 5MB chacune)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={designerImagesFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleDesignerImagesUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => designerImagesFileRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner Images Designers
                </Button>

                {results.designerImages && results.designerImages.length > 0 && (
                  <div className="text-sm">
                    {results.designerImages[0].success ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{results.designerImages[0].uploaded} designers uploadées</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span>Erreur upload</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

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

          {(results.csv || results.designers || results.images || results.designerImages) && (
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

                  {results.designerImages && (
                    <div>
                      <h4 className="font-medium">Images Designers</h4>
                      <div className="text-sm text-gray-600">
                        {results.designerImages.reduce((sum, r) => sum + (r.uploaded || 0), 0)} images designers
                        uploadées au total
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
