"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, ImageIcon, Video, FileImage } from "lucide-react"

interface UploadFormProps {
  accept: string
  onUpload: (files: File | File[]) => void
  type: "csv" | "images" | "video" | "logo"
  multiple?: boolean
  expectedColumns?: string[]
}

export function UploadForm({ accept, onUpload, type, multiple = false, expectedColumns }: UploadFormProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setSelectedFiles(files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setSelectedFiles(files)
    }
  }

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      if (multiple) {
        onUpload(selectedFiles)
      } else {
        onUpload(selectedFiles[0])
      }
      setSelectedFiles([])
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  const getIcon = () => {
    switch (type) {
      case "csv":
        return <FileText className="w-8 h-8 text-blue-500" />
      case "images":
        return <ImageIcon className="w-8 h-8 text-green-500" />
      case "video":
        return <Video className="w-8 h-8 text-purple-500" />
      case "logo":
        return <FileImage className="w-8 h-8 text-orange-500" />
      default:
        return <Upload className="w-8 h-8 text-gray-500" />
    }
  }

  const getTitle = () => {
    switch (type) {
      case "csv":
        return "Fichier CSV"
      case "images":
        return "Images"
      case "video":
        return "Vidéo"
      case "logo":
        return "Logo"
      default:
        return "Fichiers"
    }
  }

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <CardContent className="p-8">
          <div
            className="text-center cursor-pointer"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleChange}
              className="hidden"
            />

            <div className="flex flex-col items-center space-y-4">
              {getIcon()}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{getTitle()}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Glissez-déposez {multiple ? "vos fichiers" : "votre fichier"} ici ou cliquez pour sélectionner
                </p>
              </div>

              {expectedColumns && (
                <div className="text-xs text-gray-500">
                  <p className="font-medium mb-2">Colonnes attendues :</p>
                  <div className="flex flex-wrap gap-1">
                    {expectedColumns.map((col, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            {selectedFiles.length} fichier{selectedFiles.length > 1 ? "s" : ""} sélectionné
            {selectedFiles.length > 1 ? "s" : ""} :
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                <span className="truncate">{file.name}</span>
                <span className="text-gray-500 ml-2">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ))}
          </div>
          <Button onClick={handleUpload} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Uploader {selectedFiles.length > 1 ? `${selectedFiles.length} fichiers` : "le fichier"}
          </Button>
        </div>
      )}
    </div>
  )
}
