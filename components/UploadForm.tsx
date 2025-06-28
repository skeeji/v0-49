"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, ImageIcon, Video, Tag } from "lucide-react"
import Papa from "papaparse"

interface UploadFormProps {
  onUpload: (data: any) => void
  accept?: string
  multiple?: boolean
  type?: "csv" | "images" | "video" | "logo"
  expectedColumns?: string[]
  buttonText?: string
  onUploadStart?: () => void
}

export function UploadForm({
  onUpload,
  accept = "*",
  multiple = false,
  type = "csv",
  expectedColumns = [],
  buttonText,
  onUploadStart,
}: UploadFormProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getIcon = () => {
    switch (type) {
      case "csv":
        return <FileText className="w-8 h-8 text-gray-400" />
      case "images":
        return <ImageIcon className="w-8 h-8 text-gray-400" />
      case "video":
        return <Video className="w-8 h-8 text-gray-400" />
      case "logo":
        return <Tag className="w-8 h-8 text-gray-400" />
      default:
        return <Upload className="w-8 h-8 text-gray-400" />
    }
  }

  const getDefaultButtonText = () => {
    switch (type) {
      case "csv":
        return "Sélectionner un fichier CSV"
      case "images":
        return multiple ? "Sélectionner des images" : "Sélectionner une image"
      case "video":
        return "Sélectionner une vidéo"
      case "logo":
        return "Sélectionner un logo"
      default:
        return "Sélectionner un fichier"
    }
  }

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return

    setIsProcessing(true)
    onUploadStart?.()

    try {
      if (type === "csv") {
        // Traitement CSV
        const file = files[0]
        const text = await file.text()

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter: ";", // Utiliser point-virgule par défaut
          complete: (results) => {
            console.log("📊 CSV parsé:", results.data.length, "lignes")
            console.log("📋 Colonnes:", results.meta.fields)

            if (expectedColumns.length > 0) {
              const missingColumns = expectedColumns.filter((col) => !results.meta.fields?.includes(col))
              if (missingColumns.length > 0) {
                console.warn("⚠️ Colonnes manquantes:", missingColumns)
              }
            }

            onUpload(results.data)
          },
          error: (error) => {
            console.error("❌ Erreur parsing CSV:", error)
            // Essayer avec virgule si point-virgule échoue
            Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              delimiter: ",",
              complete: (results) => {
                console.log("📊 CSV parsé avec virgule:", results.data.length, "lignes")
                onUpload(results.data)
              },
              error: (error2) => {
                console.error("❌ Erreur parsing CSV avec virgule:", error2)
                alert("Erreur lors de la lecture du fichier CSV")
              },
            })
          },
        })
      } else {
        // Traitement fichiers (images, vidéo, logo)
        if (multiple) {
          onUpload(Array.from(files))
        } else {
          onUpload(files[0])
        }
      }
    } catch (error) {
      console.error("❌ Erreur traitement fichier:", error)
      alert("Erreur lors du traitement du fichier")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? "border-orange bg-orange/5" : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center space-y-4">
          {getIcon()}

          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragging ? "Déposez le fichier ici" : "Glissez-déposez votre fichier"}
            </p>
            <p className="text-sm text-gray-500">ou</p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-orange hover:bg-orange/90"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                Traitement...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {buttonText || getDefaultButtonText()}
              </>
            )}
          </Button>

          {expectedColumns.length > 0 && (
            <div className="text-xs text-gray-500 mt-2">
              <p className="font-medium">Colonnes attendues :</p>
              <p>{expectedColumns.join(", ")}</p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
