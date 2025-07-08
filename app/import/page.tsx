"use client"

import { useState } from "react"
import { ImageIcon, Upload, Users } from "lucide-react"

export default function ImportPage() {
  const [uploadStatus, setUploadStatus] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [designerImagesUploadStatus, setDesignerImagesUploadStatus] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const handleImagesUpload = async (files: File[]) => {
    setUploadStatus(null)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("images", file)
      })

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadStatus({
          success: true,
          message: `✅ ${result.uploaded} images uploadées avec succès`,
        })
      } else {
        throw new Error(result.error || "Erreur inconnue")
      }
    } catch (error: any) {
      setUploadStatus({
        success: false,
        message: `❌ Erreur: ${error.message}`,
      })
    }
  }

  const handleDesignerImagesUpload = async (files: File[]) => {
    setDesignerImagesUploadStatus(null)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("images", file)
      })
      formData.append("forceDesignerImages", "true")

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setDesignerImagesUploadStatus({
          success: true,
          message: `✅ ${result.uploaded} images de designers uploadées avec succès`,
        })
      } else {
        throw new Error(result.error || "Erreur inconnue")
      }
    } catch (error: any) {
      setDesignerImagesUploadStatus({
        success: false,
        message: `❌ Erreur: ${error.message}`,
      })
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-semibold mb-6">Import</h1>

      {/* Section Upload Images */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Upload Images
        </h2>
        <p className="text-gray-600 mb-4">Uploadez les images ici.</p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              if (files.length > 0) {
                handleImagesUpload(files)
              }
            }}
            className="hidden"
            id="images-upload"
          />
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label
              htmlFor="images-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Sélectionner Images
            </label>
            <p className="text-sm text-gray-500 mt-2">PNG, JPG jusqu'à 10MB chacune</p>
          </div>
        </div>

        {uploadStatus && (
          <div
            className={`mt-4 p-4 rounded-lg ${uploadStatus.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
          >
            {uploadStatus.message}
          </div>
        )}
      </div>

      {/* Section Upload Images Designers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Upload Images Designers
        </h2>
        <p className="text-gray-600 mb-4">
          Uploadez spécifiquement les images des designers. Ces images seront automatiquement placées dans le dossier
          "designers" lors de l'export.
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              if (files.length > 0) {
                handleDesignerImagesUpload(files)
              }
            }}
            className="hidden"
            id="designer-images-upload"
          />
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label
              htmlFor="designer-images-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Sélectionner Images Designers
            </label>
            <p className="text-sm text-gray-500 mt-2">
              PNG, JPG jusqu'à 10MB chacune. Ces images seront marquées comme images de designers.
            </p>
          </div>
        </div>

        {designerImagesUploadStatus && (
          <div
            className={`mt-4 p-4 rounded-lg ${designerImagesUploadStatus.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
          >
            {designerImagesUploadStatus.message}
          </div>
        )}
      </div>
    </div>
  )
}
