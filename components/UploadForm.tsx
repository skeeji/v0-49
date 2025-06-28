"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface UploadFormProps {
  onUpload: (file: File) => void
  isUploading?: boolean
  accept?: string
  buttonText?: string
  onUploadStart?: () => void
}

export function UploadForm({
  onUpload,
  isUploading = false,
  accept = "*",
  buttonText = "Télécharger",
  onUploadStart,
}: UploadFormProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUploadStart?.()
      onUpload(selectedFile)
    }
  }

  const openFileDialog = () => {
    inputRef.current?.click()
  }

  return (
    <div className="w-full">
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300"
        }`}
      >
        <CardContent className="p-6">
          <div
            className="text-center"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />

            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {selectedFile ? (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900">Fichier sélectionné:</p>
                <p className="text-sm text-gray-500">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Glissez-déposez votre fichier ici, ou{" "}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                    onClick={openFileDialog}
                  >
                    parcourez
                  </button>
                </p>
                <p className="text-xs text-gray-400 mt-1">Formats acceptés: {accept}</p>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button type="button" variant="outline" onClick={openFileDialog} disabled={isUploading}>
                Choisir un fichier
              </Button>

              {selectedFile && (
                <Button type="button" onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? "Import en cours..." : buttonText}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
