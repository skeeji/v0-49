"use client"

import { useState } from "react"

const ImportPage = () => {
  const [videoUploadStatus, setVideoUploadStatus] = useState("")

  const handleVideoUpload = async (file: File) => {
    try {
      console.log(`🎥 Fichier vidéo sélectionné: ${file.name}, taille: ${file.size} bytes`)

      if (!file.type.startsWith("video/")) {
        throw new Error("Le fichier doit être une vidéo")
      }

      console.log(`🎥 Début de l'upload vidéo: ${file.name}`)
      setVideoUploadStatus("Préparation de l'upload...")

      // Diviser en chunks de 1MB pour éviter nginx 413
      const CHUNK_SIZE = 1024 * 1024 // 1MB
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

      console.log(`📦 Upload par chunks: ${totalChunks} chunks de ${CHUNK_SIZE} bytes`)

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)

        const formData = new FormData()
        formData.append("chunk", chunk)
        formData.append("chunkIndex", chunkIndex.toString())
        formData.append("totalChunks", totalChunks.toString())
        formData.append("fileName", file.name)
        formData.append("fileType", file.type)

        setVideoUploadStatus(`Upload chunk ${chunkIndex + 1}/${totalChunks}...`)

        const response = await fetch("/api/upload/video-chunks", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error)
        }

        console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploadé`)

        // Petite pause entre les chunks
        if (chunkIndex < totalChunks - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      setVideoUploadStatus("Vidéo uploadée avec succès !")
      console.log("✅ Upload vidéo terminé avec succès")

      // Rafraîchir après 2 secondes
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error("❌ Erreur critique lors de l'upload vidéo:", error)
      setVideoUploadStatus(`Erreur: ${error.message}`)
    }
  }

  return (
    <div>
      <h1>Importer une vidéo</h1>
      <input type="file" onChange={(e) => handleVideoUpload(e.target.files[0])} />
      <p>{videoUploadStatus}</p>
    </div>
  )
}

export default ImportPage
