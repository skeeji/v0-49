import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 === DÉBUT UPLOAD VIDÉO ===")

    const { db } = await connectToDatabase()
    const bucket = new GridFSBucket(db, { bucketName: "videos" })

    const formData = await request.formData()
    const videoFile = formData.get("video") as File

    if (!videoFile) {
      return NextResponse.json({ success: false, error: "Aucun fichier vidéo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier vidéo reçu: ${videoFile.name}, taille: ${videoFile.size} bytes`)

    // Supprimer l'ancienne vidéo de bienvenue s'il y en a une
    try {
      const existingVideos = await db.collection("videos.files").find({ "metadata.type": "welcome" }).toArray()
      for (const video of existingVideos) {
        await bucket.delete(video._id)
        console.log(`🗑️ Ancienne vidéo supprimée: ${video.filename}`)
      }
    } catch (error) {
      console.log("ℹ️ Aucune ancienne vidéo à supprimer")
    }

    // Convertir le fichier en buffer
    const arrayBuffer = await videoFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload vers GridFS
    const uploadStream = bucket.openUploadStream(videoFile.name, {
      metadata: {
        type: "welcome",
        originalName: videoFile.name,
        uploadDate: new Date(),
        contentType: videoFile.type,
      },
    })

    return new Promise((resolve) => {
      uploadStream.on("finish", () => {
        console.log(`✅ Vidéo uploadée avec succès: ${videoFile.name}, ID: ${uploadStream.id}`)
        resolve(
          NextResponse.json({
            success: true,
            message: `Vidéo de fond uploadée avec succès: ${videoFile.name}`,
            fileId: uploadStream.id.toString(),
            filename: videoFile.name,
          }),
        )
      })

      uploadStream.on("error", (error) => {
        console.error("❌ Erreur upload vidéo:", error)
        resolve(NextResponse.json({ success: false, error: "Erreur lors de l'upload de la vidéo" }, { status: 500 }))
      })

      uploadStream.end(buffer)
    })
  } catch (error) {
    console.error("❌ Erreur générale upload vidéo:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur lors de l'upload vidéo" }, { status: 500 })
  }
}
