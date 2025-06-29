"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, ImageIcon, Video, Database } from "lucide-react"
import Papa from "papaparse"

interface UploadFormProps {
  accept: string
  onUpload: (data: any) => void
  type: "csv" | "images" | "video" | "logo"
  multiple?: boolean
  expectedColumns?: string[]
}

export function UploadForm({ accept, onUpload, type, multiple = false, expectedColumns = [] }: UploadFormProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return

    setIsProcessing(true)

    try {
      if (type === "csv") {
        // Traiter le fichier CSV
        const file = files[0]
        console.log(`📄 Traitement du fichier CSV: ${file.name}`)

        const text = await file.text()
        console.log(`📄 Contenu lu: ${text.length} caractères`)

        // Parser avec Papa Parse
        const parseResult = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter: ";", // Essayer d'abord avec point-virgule
          encoding: "UTF-8",
          transformHeader: (header: string) => header.trim(),
        })

        let data = parseResult.data as any[]

        // Si pas de données avec point-virgule, essayer avec virgule
        if (data.length === 0 || parseResult.errors.length > 0) {
          console.log("🔄 Tentative avec délimiteur virgule...")
          const parseResult2 = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            delimiter: ",",
            encoding: "UTF-8",
            transformHeader: (header: string) => header.trim(),
          })
          data = parseResult2.data as any[]
        }

        console.log(`📊 CSV parsé: ${data.length} lignes`)
        console.log("📋 Colonnes détectées:", Object.keys(data[0] || {}))

        if (data.length === 0) {
          throw new Error("Aucune donnée trouvée dans le fichier CSV")
        }

        // Nettoyer les données
        const cleanedData = data
          .filter((row) => {
            // Filtrer les lignes vides
            const values = Object.values(row).filter((val) => val && val.toString().trim() !== "")
            return values.length > 0
          })
          .map((row) => {
            // Nettoyer chaque cellule
            const cleanedRow: any = {}
            for (const [key, value] of Object.entries(row)) {
              cleanedRow[key.trim()] = value ? value.toString().trim() : ""
            }
            return cleanedRow
          })

        console.log(`✅ Données nettoyées: ${cleanedData.length} lignes valides`)

        onUpload(cleanedData)
      } else {
        // Traiter les fichiers images/vidéo/logo
        onUpload(multiple ? files : files[0])
      }
    } catch (error: any) {
      console.error("❌ Erreur traitement fichier:", error)
      alert(`Erreur: ${error.message}`)
    } finally {
      setIsProcessing(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const getIcon = () => {
    switch (type) {
      case "csv":
        return <FileText className="h-8 w-8" />
      case "images":
        return <ImageIcon className="h-8 w-8" />
      case "video":
        return <Video className="h-8 w-8" />
      case "logo":
        return <Database className="h-8 w-8" />
      default:
        return <Upload className="h-8 w-8" />
    }
  }

  const getTitle = () => {
    switch (type) {
      case "csv":
        return "Glissez votre fichier CSV ici"
      case "images":
        return multiple ? "Glissez vos images ici" : "Glissez votre image ici"
      case "video":
        return "Glissez votre vidéo ici"
      case "logo":
        return "Glissez votre logo ici"
      default:
        return "Glissez vos fichiers ici"
    }
  }

  const getDescription = () => {
    switch (type) {
      case "csv":
        return "Fichier CSV avec délimiteur point-virgule (;) ou virgule (,)"
      case "images":
        return "Images JPG, PNG, WebP"
      case "video":
        return "Vidéo MP4"
      case "logo":
        return "Image PNG, JPG, SVG"
      default:
        return "Fichiers supportés"
    }
  }

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
          ${
            isDragging
              ? "border-blue-400 bg-blue-50 scale-105"
              : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
          }
          ${isProcessing ? "opacity-50 pointer-events-none" : "cursor-pointer"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-4">
          <div
            className={`
            p-4 rounded-full transition-colors duration-300
            ${isDragging ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-600"}
          `}
          >
            {getIcon()}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{getTitle()}</h3>
            <p className="text-sm text-slate-600 mb-4">{getDescription()}</p>

            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-600">Traitement en cours...</span>
              </div>
            ) : (
              <Button variant="outline" className="bg-white hover:bg-slate-50">
                <Upload className="h-4 w-4 mr-2" />
                Choisir {multiple ? "des fichiers" : "un fichier"}
              </Button>
            )}
          </div>
        </div>

        {expectedColumns.length > 0 && (
          <div className="mt-6 p-4 bg-white rounded-lg border border-slate-200">
            <h4 className="text-sm font-medium text-slate-800 mb-2">Colonnes attendues :</h4>
            <div className="flex flex-wrap gap-2">
              {expectedColumns.map((col, index) => (
                <span key={index} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md border">
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
