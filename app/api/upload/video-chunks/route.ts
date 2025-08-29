import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { uploadFile } from "@/lib/gridfs"
import { writeFile, readFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API upload/video-chunks: Début upload chunk vidéo")

    const formData = await request.formData()
    const chunk = formData.get("chunk") as File
    const chunkIndex = Number.parseInt(formData.get("chunkIndex") as string)
    const totalChunks = Number.parseInt(formData.get("totalChunks") as string)
    const fileName = formData.get("fileName") as string
    const fileType = formData.get("fileType") as string

    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName) {
      return NextResponse.json({ success: false, error: "Paramètres manquants" })
    }

    console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} reçu: ${chunk.size} bytes`)

    // Créer un nom de fichier temporaire unique basé sur le nom original
    const tempDir = tmpdir()
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const tempFileName = `video_${Date.now()}_${safeFileName}`
    const tempFilePath = join(tempDir, tempFileName)

    // Sauvegarder le chunk
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer())

    if (chunkIndex === 0) {
      // Premier chunk - créer le fichier
      await writeFile(tempFilePath, chunkBuffer)
      console.log(`✅ Premier chunk sauvegardé: ${tempFilePath}`)
    } else {
      // Chunks suivants - ajouter au fichier existant
      try {
        const existingData = await readFile(tempFilePath)
        const combinedData = Buffer.concat([existingData, chunkBuffer])
        await writeFile(tempFilePath, combinedData)
        console.log(`✅ Chunk ${chunkIndex + 1} ajouté au fichier`)
      } catch (readError) {
        console.error(`❌ Erreur lecture fichier temporaire:`, readError)
        return NextResponse.json({ success: false, error: "Fichier temporaire introuvable" })
      }
    }

    // Si c'est le dernier chunk, traiter le fichier complet
    if (chunkIndex === totalChunks - 1) {
      console.log("🎬 Dernier chunk reçu, assemblage et upload final...")

      try {
        const db = await getDatabase()

        // Supprimer l'ancienne vidéo s'il y en a une
        const oldVideo = await db.collection("videos").findOne({})
        if (oldVideo) {
          console.log("🗑️ Suppression de l'ancienne vidéo")
          await db.collection("videos").deleteOne({ _id: oldVideo._id })
        }

        // Lire le fichier complet
        const completeBuffer = await readFile(tempFilePath)
        console.log(`📁 Fichier complet assemblé: ${completeBuffer.length} bytes`)

        // Uploader vers GridFS
        console.log("📤 Upload vers GridFS...")
        const fileId = await uploadFile(fileName, completeBuffer, fileType)
        console.log("✅ Fichier uploadé vers GridFS, ID:", fileId)

        // Sauvegarder les métadonnées en base
        const videoDoc = {
          filename: fileName,
          fileId: fileId,
          contentType: fileType,
          size: completeBuffer.length,
          uploadDate: new Date(),
        }

        const result = await db.collection("videos").insertOne(videoDoc)
        console.log("✅ Métadonnées vidéo sauvegardées, ID:", result.insertedId)

        // Nettoyer le fichier temporaire
        try {
          await unlink(tempFilePath)
          console.log("🧹 Fichier temporaire supprimé")
        } catch (cleanupError) {
          console.warn("⚠️ Erreur nettoyage fichier temporaire:", cleanupError)
        }

        return NextResponse.json({
          success: true,
          message: "Vidéo uploadée avec succès",
          videoId: result.insertedId,
          isComplete: true,
        })
      } catch (finalError) {
        console.error("❌ Erreur lors du traitement final:", finalError)

        // Nettoyer le fichier temporaire en cas d'erreur
        try {
          await unlink(tempFilePath)
        } catch (cleanupError) {
          console.warn("⚠️ Erreur nettoyage après échec:", cleanupError)
        }

        return NextResponse.json({
          success: false,
          error: `Erreur traitement final: ${finalError.message}`,
        })
      }
    }

    // Chunk intermédiaire
    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} reçu`,
      isComplete: false,
    })
  } catch (error) {
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
