import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { uploadFile } from "@/lib/gridfs"
import fs from "fs"
import path from "path"
import os from "os"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API upload/video-chunks: Début traitement chunk vidéo")

    const formData = await request.formData()
    const chunk = formData.get("chunk") as File
    const chunkIndex = Number.parseInt(formData.get("chunkIndex") as string)
    const totalChunks = Number.parseInt(formData.get("totalChunks") as string)
    const fileName = formData.get("fileName") as string
    const fileType = formData.get("fileType") as string

    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName) {
      return NextResponse.json({ success: false, error: "Paramètres manquants" })
    }

    console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} reçu pour ${fileName}`)

    // Créer le dossier temporaire
    const tempDir = path.join(os.tmpdir(), "video-chunks")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Sauvegarder le chunk
    const chunkPath = path.join(tempDir, `${fileName}.chunk.${chunkIndex}`)
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer())
    fs.writeFileSync(chunkPath, chunkBuffer)

    console.log(`✅ Chunk ${chunkIndex + 1} sauvegardé: ${chunkPath}`)

    // Si c'est le dernier chunk, assembler le fichier complet
    if (chunkIndex === totalChunks - 1) {
      console.log("🔧 Assemblage du fichier complet...")

      try {
        // Lire et assembler tous les chunks
        const chunks = []
        for (let i = 0; i < totalChunks; i++) {
          const chunkFilePath = path.join(tempDir, `${fileName}.chunk.${i}`)
          if (fs.existsSync(chunkFilePath)) {
            const chunkData = fs.readFileSync(chunkFilePath)
            chunks.push(chunkData)
            console.log(`📖 Chunk ${i + 1} lu: ${chunkData.length} bytes`)
          } else {
            throw new Error(`Chunk ${i} manquant: ${chunkFilePath}`)
          }
        }

        // Assembler le fichier complet
        const completeFile = Buffer.concat(chunks)
        console.log(`🔧 Fichier assemblé: ${completeFile.length} bytes`)

        // Uploader vers GridFS
        const db = await getDatabase()

        // Supprimer l'ancienne vidéo s'il y en a une
        const oldVideo = await db.collection("videos").findOne({})
        if (oldVideo) {
          console.log("🗑️ Suppression de l'ancienne vidéo")
          await db.collection("videos").deleteOne({ _id: oldVideo._id })
        }

        console.log("📤 Upload vers GridFS...")
        const fileId = await uploadFile(fileName, completeFile, fileType)
        console.log("✅ Fichier uploadé vers GridFS, ID:", fileId)

        // Sauvegarder les métadonnées en base
        const videoDoc = {
          filename: fileName,
          fileId: fileId,
          contentType: fileType,
          size: completeFile.length,
          uploadDate: new Date(),
        }

        const result = await db.collection("videos").insertOne(videoDoc)
        console.log("✅ Métadonnées vidéo sauvegardées, ID:", result.insertedId)

        // Nettoyer les fichiers temporaires
        for (let i = 0; i < totalChunks; i++) {
          const chunkFilePath = path.join(tempDir, `${fileName}.chunk.${i}`)
          if (fs.existsSync(chunkFilePath)) {
            fs.unlinkSync(chunkFilePath)
          }
        }
        console.log("🧹 Fichiers temporaires nettoyés")

        return NextResponse.json({
          success: true,
          message: "Vidéo uploadée avec succès",
          videoId: result.insertedId,
        })
      } catch (assemblyError: any) {
        console.error("❌ Erreur lors de l'assemblage:", assemblyError)

        // Nettoyer les fichiers temporaires en cas d'erreur
        try {
          for (let i = 0; i < totalChunks; i++) {
            const chunkFilePath = path.join(tempDir, `${fileName}.chunk.${i}`)
            if (fs.existsSync(chunkFilePath)) {
              fs.unlinkSync(chunkFilePath)
            }
          }
        } catch (cleanupError) {
          console.error("❌ Erreur nettoyage:", cleanupError)
        }

        return NextResponse.json({
          success: false,
          error: `Erreur assemblage: ${assemblyError.message}`,
        })
      }
    }

    // Pour les chunks intermédiaires, juste confirmer la réception
    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} reçu`,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload chunk vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
