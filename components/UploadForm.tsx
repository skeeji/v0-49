"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, ImageIcon, Video, Palette } from "lucide-react"
import Papa from "papaparse"

interface UploadFormProps {
  accept: string
  multiple?: boolean
  onUpload: (data: any) => void
  type: "csv" | "images" | "video" | "logo"
  expectedColumns?: string[]
}

export function UploadForm({ accept, multiple = false, onUpload, type, expectedColumns = [] }: UploadFormProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getIcon = () => {
    switch (type) {
      case "csv":
        return <FileText className="w-8 h-8 text-slate-400" />
      case "images":
        return <ImageIcon className="w-8 h-8 text-slate-400" />
      case "video":
        return <Video className="w-8 h-8 text-slate-400" />
      case "logo":
        return <Palette className="w-8 h-8 text-slate-400" />
      default:
        return <Upload className="w-8 h-8 text-slate-400" />
    }
  }

  const getTitle = () => {
    switch (type) {
      case "csv":
        return "Fichier CSV"
      case "images":
        return multiple ? "Images (multiple)" : "Image"
      case "video":
        return "Vidéo MP4"
      case "logo":
        return "Logo (PNG/JPG)"
      default:
        return "Fichier"
    }
  }

  const getDescription = () => {
    switch (type) {
      case "csv":
        return "Glissez votre fichier CSV ici ou cliquez pour sélectionner"
      case "images":
        return multiple
          ? "Glissez vos images ici ou cliquez pour sélectionner (JPG, PNG, WebP)"
          : "Glissez votre image ici ou cliquez pour sélectionner"
      case "video":
        return "Glissez votre vidéo MP4 ici ou cliquez pour sélectionner"
      case "logo":
        return "Glissez votre logo ici ou cliquez pour sélectionner"
      default:
        return "Glissez vos fichiers ici ou cliquez pour sélectionner"
    }
  }

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
        // Traitement CSV
        const file = files[0]
        console.log("📄 Traitement du fichier CSV:", file.name)

        const text = await file.text()
        console.log("📄 Contenu lu:", text.length, "caractères")

        // Fonction de parsing avec différents délimiteurs
        const parseWithDelimiter = (delimiter: string): Promise<any[]> => {
          return new Promise((resolve, reject) => {
            Papa.parse(text, {
              delimiter: delimiter,
              header: true,
              skipEmptyLines: true,
              transformHeader: (header: string) => {
                // Nettoyer les headers
                return header
                  .trim()
                  .replace(/[^\w\s]/g, "")
                  .replace(/\s+/g, " ")
              },
              transform: (value: string) => {
                // Nettoyer les valeurs
                return value ? value.toString().trim() : ""
              },
              complete: (results) => {
                console.log(`📊 CSV parsé: ${results.data.length} lignes`)
                if (results.data.length > 0) {
                  console.log("📋 Colonnes détectées:", Object.keys(results.data[0]))
                }
                resolve(results.data)
              },
              error: (error) => {
                console.error("❌ Erreur parsing CSV:", error)
                reject(error)
              },
            })
          })
        }

        let data: any[] = []

        // Essayer d'abord avec point-virgule
        try {
          console.log("🔄 Tentative avec délimiteur point-virgule...")
          data = await parseWithDelimiter(";")
          if (data.length === 0) throw new Error("Aucune donnée avec point-virgule")
        } catch (error) {
          console.log("🔄 Tentative avec délimiteur virgule...")
          try {
            data = await parseWithDelimiter(",")
            if (data.length === 0) throw new Error("Aucune donnée avec virgule")
          } catch (error2) {
            console.log("🔄 Tentative avec délimiteur tabulation...")
            data = await parseWithDelimiter("\t")
          }
        }

        // Nettoyer les données
        const cleanedData = data.filter((row) => {
          // Supprimer les lignes complètement vides
          const values = Object.values(row).filter((val) => val && val.toString().trim() !== "")
          return values.length > 0
        })

        console.log("✅ Données nettoyées:", cleanedData.length, "lignes valides")

        if (cleanedData.length === 0) {
          throw new Error("Aucune donnée valide trouvée dans le fichier CSV")
        }

        onUpload(cleanedData)
      } else {
        // Traitement des autres types de fichiers
        if (multiple) {
          onUpload(files)
        } else {
          onUpload(files[0])
        }
      }
    } catch (error: any) {
      console.error("❌ Erreur traitement fichier:", error)
      alert(`Erreur: ${error.message}`)
    } finally {
      setIsProcessing(false)
      // Réinitialiser l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer
          ${
            isDragging
              ? "border-blue-400 bg-blue-50 scale-105"
              : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
          }
          ${isProcessing ? "opacity-50 pointer-events-none" : ""}
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
          {isProcessing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          ) : (
            getIcon()
          )}

          <div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">{getTitle()}</h3>
            <p className="text-sm text-slate-600 mb-4">{getDescription()}</p>

            {isProcessing ? (
              <p className="text-sm text-blue-600 font-medium">Traitement en cours...</p>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="bg-white hover:bg-slate-50 border-slate-300"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Sélectionner {multiple ? "les fichiers" : "le fichier"}
              </Button>
            )}
          </div>

          {expectedColumns.length > 0 && (
            <div className="text-xs text-slate-500 mt-4">
              <p className="font-medium mb-1">Colonnes attendues :</p>
              <p>{expectedColumns.join(", ")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
