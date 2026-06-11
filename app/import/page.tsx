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
  totalErrors?: number
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

// ── Compression d'image côté client (canvas) ──────────────────────────────────
// Réduit une image à max maxWidth px et l'exporte en JPEG pour rester sous 4 MB
function compressImage(file: File, maxWidth = 1920, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Canvas non supporté")); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression échouée"))),
        "image/jpeg",
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Lecture image échouée")) }
    img.src = objectUrl
  })
}

// ── Redimensionnement PNG avec préservation de la transparence ────────────────
// Réduit à max maxDim px et exporte en PNG (canvas + clearRect pour alpha)
function compressPNG(file: File, maxDim = 1800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement("canvas")
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Canvas non supporté")); return }
      ctx.clearRect(0, 0, w, h)   // fond transparent
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Export PNG échoué"))),
        "image/png"
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Lecture image échouée")) }
    img.src = objectUrl
  })
}

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
    homepageImages?: { [key: string]: ImportResult }
    painting?: ImportResult
  }>({})
  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingImages, setExportingImages] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedHomepageSection, setSelectedHomepageSection] = useState("")
  const [selectedHomepageIndex, setSelectedHomepageIndex] = useState("0")
  const [homepageDesignerName, setHomepageDesignerName] = useState("")

  // ── Galerie peinture ──────────────────────────────────────────────────────────
  const [galerieResult,   setGalerieResult]   = useState<{ success?: boolean; inserted?: number; skipped?: number; errors?: string[] } | null>(null)
  const [galerieLoading,  setGalerieLoading]  = useState(false)
  const [galerieProgress, setGalerieProgress] = useState(0)
  const [galerieStep,     setGalerieStep]     = useState("")
  const galerieCsvRef    = useRef<HTMLInputElement>(null)
  const galerieImgsRef   = useRef<HTMLInputElement>(null)
  const [galerieCsvFile, setGalerieCsvFile]   = useState<File | null>(null)
  const [galerieImgFiles, setGalerieImgFiles] = useState<FileList | null>(null)

  const csvFileRef = useRef<HTMLInputElement>(null)
  const designersFileRef = useRef<HTMLInputElement>(null)
  const imagesFileRef = useRef<HTMLInputElement>(null)
  const designerImagesFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)
  const periodImageFileRef = useRef<HTMLInputElement>(null)
  const homepageImageFileRef = useRef<HTMLInputElement>(null)
  const paintingFileRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()

  // ── Handler galerie ───────────────────────────────────────────────────────────
  const handleGalerieUpload = async () => {
    if (!galerieCsvFile) { toast({ title: "CSV manquant", variant: "destructive" }); return }
    setGalerieLoading(true)
    setGalerieResult(null)

    try {
      // ── 1. Parser le CSV côté client ──────────────────────────────────────────
      const csvText = await galerieCsvFile.text()
      const lines   = csvText.replace(/\r/g, "").split("\n").filter(l => l.trim())
      if (lines.length < 2) { toast({ title: "CSV vide", variant: "destructive" }); return }

      const headers = parseCSVLine(lines[0])
      const rows = lines.slice(1).map(line => {
        const vals = parseCSVLine(line)
        return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").replace(/^"|"$/g, "")]))
      }).filter(r => r.nom || r["nom"])

      // ── 2. Map filename → File ────────────────────────────────────────────────
      const imageMap = new Map<string, File>()
      if (galerieImgFiles) {
        for (let i = 0; i < galerieImgFiles.length; i++) {
          imageMap.set(galerieImgFiles[i].name, galerieImgFiles[i])
        }
      }

      // ── 3. Upload image par image (évite le 413) ──────────────────────────────
      let inserted = 0, skipped = 0
      const errors: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row      = rows[i]
        const nom      = (row.nom      || "").trim()
        const designer = (row.designer || "").trim()
        const annee    = (row.annee    || "").trim()
        const filename = (row.image    || "").trim()

        if (!nom) { skipped++; continue }

        const imgFile = filename ? imageMap.get(filename) : undefined
        if (filename && !imgFile) {
          errors.push(`Image manquante : ${filename}`)
          skipped++
          continue
        }

        setGalerieProgress(Math.round(((i + 1) / rows.length) * 100))
        setGalerieStep(`${i + 1}/${rows.length} — ${nom}`)

        const fd = new FormData()
        fd.append("action",   "image")
        fd.append("nom",      nom)
        fd.append("designer", designer)
        fd.append("annee",    annee)
        fd.append("filename", filename)
        if (imgFile) fd.append("image", imgFile)

        try {
          const res  = await fetch("/api/galerie/upload", { method: "POST", body: fd })
          const data = await res.json()
          if (data.success) inserted++
          else { errors.push(`${nom} : ${data.error || "erreur"}`); skipped++ }
        } catch (e: any) {
          errors.push(`${nom} : ${e.message}`)
          skipped++
        }
      }

      setGalerieResult({ success: true, inserted, skipped, errors })
      toast({ title: `✅ ${inserted} luminaire(s) importé(s) dans la galerie` })
    } catch (e: any) {
      toast({ title: "❌ Erreur", description: e.message, variant: "destructive" })
    } finally {
      setGalerieLoading(false)
      setGalerieProgress(0)
      setGalerieStep("")
    }
  }

  const handleGalerieClear = async () => {
    if (!confirm("Vider toute la galerie peinture ? (luminaires + images)")) return
    setGalerieLoading(true)
    try {
      const fd = new FormData()
      fd.append("action", "clear")
      const res  = await fetch("/api/galerie/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.success) toast({ title: "✅ Galerie vidée" })
    } catch {}
    setGalerieLoading(false)
  }

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

      const imageColumnIndex = headers.findIndex(
        (h) => h === "Image luminaire (Nom du fichier)" || h === "Nom du fichier",
      )
      console.log(`📸 Colonne image trouvée à l'index ${imageColumnIndex}`)

      const CHUNK_SIZE = 50
      const dataLines = lines.slice(1)
      const chunks = []

      for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
        const chunkLines = dataLines.slice(i, i + CHUNK_SIZE)
        const chunkData = chunkLines.map((line) => parseCSVLine(line))
        chunks.push(chunkData)
      }

      console.log(`📦 ${chunks.length} chunks de ${CHUNK_SIZE} lignes créés pour ${dataLines.length} lignes de données`)

      let totalImported = 0
      let totalSkipped = 0
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
            totalSkipped += result.skipped || 0
            totalProcessed += result.processed || 0
            if (result.errors) {
              allErrors.push(...result.errors)
            }
            console.log(`✅ Chunk ${chunkIndex + 1}: ${result.imported} importés, ${result.skipped} doublons skippés`)
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
        message: `Import terminé: ${totalImported} luminaires importés, ${totalSkipped} doublons ignorés sur ${totalProcessed} lignes traitées`,
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

        let retries = 3
        let success = false

        while (retries > 0 && !success) {
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
              console.log(
                `✅ ${file.name}: ${result.skipped ? "déjà existant" : "uploadé"}, ${result.associated || 0} associés`,
              )
              success = true
            } else {
              throw new Error(result.error)
            }
          } catch (fileError: any) {
            retries--
            if (retries > 0) {
              console.log(`⚠️ Retry ${3 - retries}/3 pour ${file.name}`)
              await new Promise((resolve) => setTimeout(resolve, 2000))
            } else {
              const errorMsg = `Erreur ${file.name}: ${fileError.message}`
              errors.push(errorMsg)
              console.error(`❌ ${errorMsg}`)
            }
          }
        }

        if (i < files.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800))
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

  const handleHomepageImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedHomepageSection) return

    setIsUploading(true)
    setCurrentStep(`Upload image accueil ${selectedHomepageSection} #${selectedHomepageIndex}...`)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("section", selectedHomepageSection)
      formData.append("index", selectedHomepageIndex)
      if (selectedHomepageSection === "designer" && homepageDesignerName.trim()) {
        formData.append("designerName", homepageDesignerName.trim())
      }

      const response = await fetch("/api/upload/homepage-images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      const key = `${selectedHomepageSection}_${selectedHomepageIndex}`

      setResults((prev) => ({
        ...prev,
        homepageImages: {
          ...prev.homepageImages,
          [key]: result,
        },
      }))

      if (result.success) {
        toast({ title: "Image accueil uploadee", description: result.message })
      } else {
        toast({ title: "Erreur upload", description: result.message, variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Erreur critique", description: "Impossible d'uploader l'image", variant: "destructive" })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentStep("")
      if (homepageImageFileRef.current) homepageImageFileRef.current.value = ""
    }
  }

  const handlePaintingUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(5)
    setCurrentStep("Préparation du tableau PNG...")

    try {
      // Redimensionner si nécessaire en préservant le canal alpha (PNG)
      let uploadBlob: Blob = file
      const originalMB = (file.size / 1_048_576).toFixed(1)

      if (file.size > 4.5 * 1_048_576) {
        setCurrentStep(`Redimensionnement PNG (${originalMB} MB) — préservation transparence...`)
        uploadBlob = await compressPNG(file, 2400)
        const newMB = (uploadBlob.size / 1_048_576).toFixed(1)
        setCurrentStep(`PNG OK (${originalMB} MB → ${newMB} MB)`)
      }

      setUploadProgress(15)

      const uploadFile = new File(
        [uploadBlob],
        file.name.replace(/\.[^/.]+$/, "") + ".png",
        { type: "image/png" }
      )

      // ── Upload par chunks de 512 KB pour contourner la limite nginx ──────────
      const CHUNK_SIZE = 512 * 1024   // 512 KB
      const totalChunks = Math.ceil(uploadFile.size / CHUNK_SIZE)
      const progressPerChunk = 75 / totalChunks   // 15 % → 90 %

      setCurrentStep(`Upload par morceaux (${totalChunks} chunk${totalChunks > 1 ? "s" : ""})...`)

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end   = Math.min(start + CHUNK_SIZE, uploadFile.size)
        const chunkBlob = uploadFile.slice(start, end)

        const formData = new FormData()
        formData.append("chunk",       new File([chunkBlob], uploadFile.name, { type: "image/png" }))
        formData.append("chunkIndex",  String(i))
        formData.append("totalChunks", String(totalChunks))
        formData.append("fileName",    uploadFile.name)
        formData.append("section",     "painting")
        formData.append("index",       "transparent")   // → clé homepage_painting_transparent

        const res = await fetch("/api/upload/painting-chunks", { method: "POST", body: formData })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Erreur chunk ${i + 1}: ${errText.slice(0, 120)}`)
        }

        const data = await res.json()
        if (!data.success) throw new Error(data.error || `Erreur chunk ${i + 1}`)

        setUploadProgress(Math.round(15 + (i + 1) * progressPerChunk))
        setCurrentStep(`Envoi ${i + 1}/${totalChunks}...`)

        // Résultat final sur le dernier chunk
        if (i === totalChunks - 1) {
          setUploadProgress(100)
          setResults((prev) => ({ ...prev, painting: data }))
          toast({ title: "✅ Tableau uploadé", description: "L'image de fond a été mise à jour. Rechargez l'accueil pour voir le résultat." })
        }
      }
    } catch (err: any) {
      console.error("❌ Erreur upload tableau:", err)
      setResults((prev) => ({ ...prev, painting: { success: false, message: err.message } }))
      toast({ title: "❌ Erreur upload", description: err.message || "Impossible d'uploader le tableau", variant: "destructive" })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentStep("")
      if (paintingFileRef.current) paintingFileRef.current.value = ""
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

        const csvData = luminairesData.luminaires.map((luminaire: any) => {
          const designerName = luminaire.designer || luminaire["Artiste / Dates"] || ""
          const designer = designersMap.get(designerName)
          const designerImageFilename = luminaire.designerImageFilename || (designer && designer.imagedesigner) || ""

          const editeur =
            luminaire.editeur ||
            luminaire.Editeur ||
            luminaire["Editeur"] ||
            luminaire.éditeur ||
            luminaire["éditeur"] ||
            ""

          const specialite =
            luminaire.periode ||
            luminaire.Spécialité ||
            luminaire["Spécialité"] ||
            luminaire.specialite ||
            luminaire.Periode ||
            luminaire["Periode"] ||
            ""

          const collaboration =
            luminaire.collaboration ||
            luminaire["Collaboration / Œuvre"] ||
            luminaire["Collaboration / Oeuvre"] ||
            luminaire.Collaboration ||
            luminaire.oeuvre ||
            luminaire.Oeuvre ||
            ""

          const description =
            luminaire.description || luminaire.Description || luminaire["Description"] || luminaire.desc || ""

          const dimensions =
            luminaire.dimensions || luminaire.Dimensions || luminaire["Dimensions"] || luminaire.dimension || ""

          const estimation =
            luminaire.estimation ||
            luminaire.Estimation ||
            luminaire["Estimation"] ||
            luminaire.prix ||
            luminaire.Prix ||
            luminaire.price ||
            ""

          const lienSiteMarchand =
            luminaire.lienSiteMarchand ||
            luminaire["Lien site marchand"] ||
            luminaire["lien site marchand"] ||
            luminaire.lienSite ||
            luminaire.lien ||
            ""

          const etiquette =
            luminaire.etiquette ||
            luminaire.Etiquette ||
            luminaire["Etiquette"] ||
            luminaire.étiquette ||
            luminaire.label ||
            ""

          const bibliographie =
            luminaire.bibliographie ||
            luminaire.Bibliographie ||
            luminaire["Bibliographie"] ||
            luminaire.biblio ||
            luminaire.reference ||
            ""

          let materiaux = ""
          if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
            materiaux = luminaire.materiaux.join("; ")
          } else if (luminaire.Matériaux) {
            if (typeof luminaire.Matériaux === "string" && luminaire.Matériaux.trim() !== "") {
              materiaux = luminaire.Matériaux.trim()
            } else if (Array.isArray(luminaire.Matériaux)) {
              materiaux = luminaire.Matériaux.join("; ")
            }
          } else if (luminaire["Matériaux"]) {
            materiaux = luminaire["Matériaux"]
          } else if (luminaire.materiaux) {
            materiaux = luminaire.materiaux
          }

          const filename =
            luminaire.filename || luminaire["Nom du fichier"] || luminaire["Image luminaire (Nom du fichier)"] || ""

          const categorie = luminaire.categorie || luminaire.Catégorie || luminaire["Catégorie"] || ""

          const signe = luminaire.signe || luminaire.Signé || luminaire["Signé"] || luminaire.signed || ""

          const nom = luminaire.nom || luminaire["Nom luminaire"] || luminaire["nom luminaire"] || luminaire.name || ""

          const annee = luminaire.annee || luminaire.Année || luminaire["Année"] || luminaire.year || ""

          return {
            Signé: signe,
            "Nom luminaire": nom,
            "Artiste / Dates": designerName,
            Année: annee,
            Catégorie: categorie,
            Editeur: editeur,
            Spécialité: specialite,
            "Collaboration / Œuvre": collaboration,
            Description: description,
            Matériaux: materiaux,
            Dimensions: dimensions,
            Estimation: estimation,
            "Image luminaire (Nom du fichier)": filename,
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

        const withFilenames = csvData.filter((row) => row["Image luminaire (Nom du fichier)"] !== "").length
        console.log(`📊 Export: ${csvData.length} luminaires, ${withFilenames} avec nom de fichier`)

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
          description: `${csvData.length} luminaires - ${withFilenames} avec images`,
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
    setCurrentStep("Récupération de la liste des images...")
    setUploadProgress(5)

    try {
      console.log("📦 Début export images...")

      const listResponse = await fetch("/api/export/images-list")
      if (!listResponse.ok) {
        throw new Error("Impossible de récupérer la liste des images")
      }

      const listData = await listResponse.json()
      console.log(
        `📋 ${listData.total} images à télécharger (${listData.luminaires} luminaires, ${listData.designers} designers, ${listData.autres} autres)`,
      )

      if (listData.total === 0) {
        throw new Error("Aucune image trouvée")
      }

      const JSZip = (await import("jszip")).default
      const zip = new JSZip()

      const designersFolder = zip.folder("designers")
      const luminairesFolder = zip.folder("luminaires")
      const autresFolder = zip.folder("autres")

      let downloaded = 0
      for (const image of listData.images) {
        try {
          setCurrentStep(`Téléchargement ${downloaded + 1}/${listData.total}: ${image.filename}`)
          setUploadProgress(10 + (downloaded / listData.total) * 80)

          const imageResponse = await fetch(`/api/export/image/${image.id}`)
          if (!imageResponse.ok) {
            console.error(`❌ Erreur téléchargement ${image.filename}`)
            continue
          }

          const blob = await imageResponse.blob()

          if (image.folder === "designers" && designersFolder) {
            designersFolder.file(image.filename, blob)
          } else if (image.folder === "autres" && autresFolder) {
            autresFolder.file(image.filename, blob)
          } else if (luminairesFolder) {
            luminairesFolder.file(image.filename, blob)
          }

          downloaded++
          console.log(`✅ [${downloaded}/${listData.total}] ${image.folder}/${image.filename}`)
        } catch (error) {
          console.error(`❌ Erreur ${image.filename}:`, error)
        }
      }

      setCurrentStep("Création du fichier ZIP...")
      setUploadProgress(90)

      const zipBlob = await zip.generateAsync({ type: "blob" })

      setCurrentStep("Téléchargement du ZIP...")
      setUploadProgress(95)

      const link = document.createElement("a")
      const url = URL.createObjectURL(zipBlob)
      link.href = url
      link.download = `images_export_${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setUploadProgress(100)

      console.log(`✅ Export terminé: ${downloaded}/${listData.total} images`)
      toast({
        title: "✅ Export terminé",
        description: `${downloaded} images téléchargées (${listData.designers} designers, ${listData.luminaires} luminaires, ${listData.autres} autres)`,
      })
    } catch (error: any) {
      console.error("❌ Erreur lors de l'export des images:", error)
      toast({
        title: "❌ Erreur export",
        description: `Erreur: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setExportingImages(false)
      setUploadProgress(0)
      setCurrentStep("")
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

          {(isUploading || exportingImages) && (
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
                <CardDescription>Téléchargez toutes les images (designers + luminaires + autres)</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={exportAllImages}
                  disabled={exportingImages || isUploading || exportingCSV}
                  className="w-full"
                >
                  {exportingImages ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Téléchargement...
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

            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <ImageIcon className="w-5 h-5" />
                  Images Page Accueil
                </CardTitle>
                <CardDescription>Images pour les sections luminaires, designers et chronologie de la page d'accueil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedHomepageSection} onValueChange={(v) => { setSelectedHomepageSection(v); setSelectedHomepageIndex("0"); setHomepageDesignerName(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="luminaire">Collection Luminaires</SelectItem>
                    <SelectItem value="designer">Designers</SelectItem>
                    <SelectItem value="chronologie">Chronologie</SelectItem>
                  </SelectContent>
                </Select>

                {selectedHomepageSection && (
                  <Select value={selectedHomepageIndex} onValueChange={setSelectedHomepageIndex}>
                    <SelectTrigger>
                      <SelectValue placeholder="Position de l'image" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedHomepageSection === "luminaire" && (
                        <>
                          <SelectItem value="0">Lustre</SelectItem>
                          <SelectItem value="1">Applique</SelectItem>
                          <SelectItem value="2">Suspension</SelectItem>
                          <SelectItem value="3">Lampadaire</SelectItem>
                          <SelectItem value="4">Lampe</SelectItem>
                          <SelectItem value="5">Lanterne</SelectItem>
                          <SelectItem value="6">Plafonnier</SelectItem>
                        </>
                      )}
                      {selectedHomepageSection === "designer" && (
                        <>
                          <SelectItem value="0">Position 1</SelectItem>
                          <SelectItem value="1">Position 2</SelectItem>
                          <SelectItem value="2">Position 3</SelectItem>
                          <SelectItem value="3">Position 4</SelectItem>
                        </>
                      )}
                      {selectedHomepageSection === "chronologie" && (
                        <>
                          <SelectItem value="0">Moyen-Age</SelectItem>
                          <SelectItem value="1">Renaissance</SelectItem>
                          <SelectItem value="2">Baroque</SelectItem>
                          <SelectItem value="3">Neoclassique</SelectItem>
                          <SelectItem value="4">Empire</SelectItem>
                          <SelectItem value="5">Art Nouveau</SelectItem>
                          <SelectItem value="6">Art Deco</SelectItem>
                          <SelectItem value="7">Moderne</SelectItem>
                          <SelectItem value="8">Contemporain</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}

                {selectedHomepageSection === "designer" && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Nom du designer</label>
                    <input
                      type="text"
                      value={homepageDesignerName}
                      onChange={(e) => setHomepageDesignerName(e.target.value)}
                      placeholder="Ex: Philippe Starck"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <p className="text-xs text-gray-500">Le nom sera recherche en base pour afficher ses infos et le lien vers sa page</p>
                  </div>
                )}

                <input
                  ref={homepageImageFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleHomepageImageUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => homepageImageFileRef.current?.click()}
                  disabled={isUploading || !selectedHomepageSection}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Uploader Image Accueil
                </Button>

                {results.homepageImages && Object.keys(results.homepageImages).length > 0 && (
                  <div className="text-sm space-y-1">
                    {Object.entries(results.homepageImages).map(([key, result]) => (
                      <div key={key}>
                        {result.success ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>{key}: Image uploadee</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>{key}: Erreur</span>
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
                  <FileImage className="w-5 h-5" />
                  Tableau de fond (Galerie)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-500">
                  Image PNG/JPG avec zones chroma key (vert) — remplace l'arrière-plan de la galerie d'accueil
                </p>
                <input
                  ref={paintingFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePaintingUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => paintingFileRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading && currentStep.includes("tableau") ? currentStep : "Sélectionner Tableau"}
                </Button>

                {isUploading && currentStep && (currentStep.includes("Compression") || currentStep.includes("tableau") || currentStep.includes("Upload")) && (
                  <div className="space-y-1">
                    <p className="text-xs text-amber-600">{currentStep}</p>
                    <Progress value={uploadProgress} className="h-1" />
                  </div>
                )}

                {results.painting && !isUploading && (
                  <div className="text-sm">
                    {results.painting.success ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">Tableau uploadé avec succès</span>
                        </div>
                        <p className="text-xs text-gray-500 pl-6">Rechargez la page d'accueil pour voir le résultat</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="w-4 h-4" />
                          <span className="font-medium">Erreur upload</span>
                        </div>
                        {results.painting.message && (
                          <p className="text-xs text-red-500 pl-6">{results.painting.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Galerie Peinture ──────────────────────────────────────────── */}
            <Card className="border-amber-300 col-span-1 md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <ImageIcon className="w-5 h-5" />
                  Galerie Peinture — Luminaires détourés
                </CardTitle>
                <CardDescription>
                  Importez le CSV + les PNG détourés pour la galerie. Format CSV&nbsp;:
                  <code className="ml-1 bg-gray-100 px-1 rounded text-xs">nom, designer, annee, image</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CSV */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">1. Fichier CSV</p>
                    <input ref={galerieCsvRef} type="file" accept=".csv" className="hidden"
                      onChange={e => setGalerieCsvFile(e.target.files?.[0] ?? null)} />
                    <Button variant="outline" className="w-full" onClick={() => galerieCsvRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      {galerieCsvFile ? galerieCsvFile.name : "Sélectionner CSV"}
                    </Button>
                  </div>
                  {/* Images */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">2. Images PNG détourées (multi-sélection)</p>
                    <input ref={galerieImgsRef} type="file" accept="image/png" multiple className="hidden"
                      onChange={e => setGalerieImgFiles(e.target.files)} />
                    <Button variant="outline" className="w-full" onClick={() => galerieImgsRef.current?.click()}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {galerieImgFiles ? `${galerieImgFiles.length} image(s) sélectionnée(s)` : "Sélectionner PNG"}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    onClick={handleGalerieUpload}
                    disabled={galerieLoading || !galerieCsvFile}
                  >
                    {galerieLoading ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Import en cours…</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Importer dans la galerie</>
                    )}
                  </Button>
                  <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={handleGalerieClear} disabled={galerieLoading}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {galerieLoading && galerieStep && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-amber-500 animate-spin" />
                      <span className="text-xs text-amber-700">{galerieStep}</span>
                    </div>
                    <Progress value={galerieProgress} className="h-1" />
                  </div>
                )}

                {galerieResult && (
                  <div className="text-sm space-y-1">
                    {galerieResult.success ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{galerieResult.inserted} importé(s){galerieResult.skipped ? `, ${galerieResult.skipped} ignoré(s)` : ""}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" /><span>Erreur d'import</span>
                      </div>
                    )}
                    {galerieResult.errors && galerieResult.errors.length > 0 && (
                      <ul className="text-xs text-orange-600 pl-6 space-y-0.5">
                        {galerieResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                        {galerieResult.errors.length > 5 && <li>…et {galerieResult.errors.length - 5} autres</li>}
                      </ul>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  Exemple de ligne CSV&nbsp;: <code>Lustre Empire doré,Maison Baguès,1920,lustre_empire.png</code>
                </p>
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
