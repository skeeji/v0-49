"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, ImageIcon, Video, FileImage } from "lucide-react"

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

  const getIcon = () => {
    switch (type) {
      case "csv":
        return <FileText className="w-8 h-8 text-gray-400" />
      case "images":
        return <ImageIcon className="w-8 h-8 text-gray-400" />
      case "video":
        return <Video className="w-8 h-8 text-gray-400" />
      case "logo":
        return <FileImage className="w-8 h-8 text-gray-400" />
      default:
        return <Upload className="w-8 h-8 text-gray-400" />
    }
  }

  const getAcceptedFormats = () => {
    switch (type) {
      case "csv":
        return "Fichiers CSV (.csv)"
      case "images":
        return "Images (JPG, PNG, GIF, WebP)"
      case "video":
        return "Vidéos MP4"
      case "logo":
        return "Images (JPG, PNG, SVG)"
      default:
        return "Tous fichiers"
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
        // Pour CSV, on envoie le fichier brut au serveur
        const file = files[0]
        console.log(`📁 Fichier CSV sélectionné: ${file.name}, taille: ${file.size} bytes`)

        // Compter approximativement les lignes pour info
        const text = await file.text()
        const lineCount = text.split("\n").length - 1 // -1 pour l'en-tête
        console.log(`📊 Estimation: ~${lineCount} lignes dans le CSV`)

        // Envoyer le fichier brut
        onUpload(file)
      } else {
        // Traitement fichiers (images, vidéo, logo)
        if (multiple) {
          onUpload(files)
        } else {
          onUpload(files[0])
        }
      }
    } catch (error) {
      console.error("Erreur traitement fichier:", error)
      alert("Erreur lors du traitement du fichier")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          {getIcon()}

          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragging ? "Déposez les fichiers ici" : "Glissez-déposez vos fichiers"}
            </p>
            <p className="text-sm text-gray-500">{getAcceptedFormats()}</p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isProcessing ? "Traitement..." : "Choisir des fichiers"}
          </Button>
        </div>
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Colonnes attendues pour CSV */}
      {type === "csv" && expectedColumns.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Colonnes attendues :</h4>
          <div className="flex flex-wrap gap-2">
            {expectedColumns.map((col) => (
              <span key={col} className="px-2 py-1 bg-white rounded text-xs text-gray-600 border">
                {col}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
