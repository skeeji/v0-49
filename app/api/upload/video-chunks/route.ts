import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { uploadFile } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API upload/video-chunks: Début upload vidéo par chunks")

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

    const db = await getDatabase()
    const chunksCollection = db.collection("video_chunks")

    // Stocker le chunk temporairement
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer())
    await chunksCollection.insertOne({
      fileName,
      chunkIndex,
      data: chunkBuffer,
      timestamp: new Date(),
    })

    // Si c'est le dernier chunk, assembler le fichier complet
    if (chunkIndex === totalChunks - 1) {
      console.log("🔧 Assemblage des chunks...")

      // Récupérer tous les chunks dans l'ordre
      const allChunks = await chunksCollection.find({ fileName }).sort({ chunkIndex: 1 }).toArray()

      if (allChunks.length !== totalChunks) {
        return NextResponse.json({ success: false, error: "Chunks manquants" })
      }

      // Assembler le fichier complet
      const completeBuffer = Buffer.concat(allChunks.map((chunk) => chunk.data))
      console.log(`✅ Fichier assemblé: ${completeBuffer.length} bytes`)

      // Supprimer l'ancienne vidéo s'il y en a une
      const oldVideo = await db.collection("videos").findOne({})
      if (oldVideo) {
        console.log("🗑️ Suppression de l'ancienne vidéo")
        await db.collection("videos").deleteOne({ _id: oldVideo._id })
      }

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

      // Nettoyer les chunks temporaires
      await chunksCollection.deleteMany({ fileName })
      console.log("🧹 Chunks temporaires supprimés")

      return NextResponse.json({
        success: true,
        message: "Vidéo uploadée avec succès",
        videoId: result.insertedId,
        isComplete: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} reçu`,
      isComplete: false,
    })
  } catch (error) {
    console.error("❌ Erreur upload vidéo chunks:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
