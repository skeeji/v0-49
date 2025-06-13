"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, FileText, ImageIcon, Video } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UploadFormProps {
  accept: string
  multiple?: boolean
  onUpload: (data: any) => void
  type: "csv" | "images" | "video"
  expectedColumns?: string[]
}

export function UploadForm({ accept, multiple, onUpload, type, expectedColumns }: UploadFormProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
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

  const parseCSV = (text: string) => {
    // Nettoyer le texte et gérer les différents encodages
    const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    const lines = cleanText.split("\n").filter((line) => line.trim())

    if (lines.length === 0) return []

    // Parser la première ligne pour les headers
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine)

    console.log("Headers détectés:", headers)

    const data = []

    // Parser chaque ligne de données
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line) {
        const values = parseCSVLine(line)
        const row: any = {}

        // Associer chaque valeur à son header
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })

        // Vérifier que la ligne n'est pas vide
        const hasData = Object.values(row).some((value) => String(value).trim())
        if (hasData) {
          data.push(row)
        }
      }
    }

    console.log(`Parsed ${data.length} lignes de données`)
    return data
  }

  const parseCSVLine = (line: string): string[] => {
    const result = []
    let current = ""
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Double quote - ajouter une seule quote
          current += '"'
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === "," && !inQuotes) {
        // Fin de champ
        result.push(current.trim())
        current = ""
        i++
      } else {
        current += char
        i++
      }
    }

    // Ajouter le dernier champ
    result.push(current.trim())

    return result
  }

  const handleFiles = (files: File[]) => {
    if (type === "csv") {
      const file = files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          const data = parseCSV(text)
          console.log("Données CSV parsées:", data.length, "lignes")
          setPreview(data.slice(0, 5)) // Show first 5 rows
          onUpload(data)
        }
        // Essayer différents encodages
        reader.readAsText(file, "UTF-8")
      }
    } else if (type === "images") {
      onUpload(files)
    } else if (type === "video") {
      onUpload(files[0])
    }
  }

  const getIcon = () => {
    switch (type) {
      case "csv":
        return <FileText className="w-12 h-12 text-gray-400" />
      case "images":
        return <ImageIcon className="w-12 h-12 text-gray-400" />
      case "video":
        return <Video className="w-12 h-12 text-gray-400" />
      default:
        return <Upload className="w-12 h-12 text-gray-400" />
    }
  }

  const getLabel = () => {
    switch (type) {
      case "csv":
        return "Glissez votre fichier CSV ici"
      case "images":
        return "Glissez vos images ici"
      case "video":
        return "Glissez votre vidéo ici"
      default:
        return "Glissez vos fichiers ici"
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? "border-orange bg-orange/10" : "border-gray-300 hover:border-orange"
        }`}
      >
        {getIcon()}
        <p className="mt-4 text-lg font-medium text-gray-700">{getLabel()}</p>
        <p className="text-sm text-gray-500 mb-4">ou cliquez pour sélectionner</p>

        <Button onClick={() => fileInputRef.current?.click()} className="bg-orange hover:bg-orange/90">
          <Upload className="w-4 h-4 mr-2" />
          Sélectionner {multiple ? "des fichiers" : "un fichier"}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Aperçu CSV */}
      {type === "csv" && preview.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-2">
            Aperçu ({preview.length} premières lignes sur {preview.length} total)
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  {Object.keys(preview[0]).map((key) => (
                    <th key={key} className="text-left p-2 font-medium text-xs">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index} className="border-b">
                    {Object.values(row).map((value: any, cellIndex) => (
                      <td key={cellIndex} className="p-2 text-xs">
                        {String(value).substring(0, 50)}
                        {String(value).length > 50 ? "..." : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Colonnes attendues */}
      {expectedColumns && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Colonnes attendues :</h4>
          <div className="flex flex-wrap gap-2">
            {expectedColumns.map((column) => (
              <span key={column} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {column}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
