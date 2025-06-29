import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API /api/upload/video - Début de l'upload vidéo")

    const formData = await request.formData()
    const file = formData.get("video") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier vidéo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier vidéo reçu: ${file.name} (${file.size} bytes)`)

    // Vérifier le type de fichier
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Le fichier doit être une vidéo" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer l'ancienne vidéo de fond s'il y en a une
    try {
      const bucket = new GridFSBucket(db, { bucketName: "uploads" })
      const existingVideos = await bucket.find({ "metadata.type": "background-video" }).toArray()

      for (const video of existingVideos) {
        await bucket.delete(video._id)
        console.log(`🗑️ Ancienne vidéo supprimée: ${video.filename}`)
      }
    } catch (error) {
      console.log("⚠️ Aucune ancienne vidéo à supprimer")
    }

    // Upload de la nouvelle vidéo
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        type: "background-video",
        originalName: file.name,
        uploadDate: new Date(),
      },
    })

    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    return new Promise((resolve) => {
      uploadStream.end(uint8Array, (error) => {
        if (error) {
          console.error("❌ Erreur upload vidéo:", error)
          resolve(
            NextResponse.json(
              {
                success: false,
                error: "Erreur lors de l'upload de la vidéo",
                details: error.message,
              },
              { status: 500 },
            ),
          )
        } else {
          console.log(`✅ Vidéo uploadée avec succès: ${file.name}`)
          resolve(
            NextResponse.json({
              success: true,
              message: `Vidéo de fond uploadée avec succès: ${file.name}`,
              fileId: uploadStream.id,
              filename: file.name,
            }),
          )
        }
      })
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
