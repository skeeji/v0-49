import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"
import { Readable } from "stream"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

function fileToStream(file: File): Readable {
  const reader = file.stream().getReader()
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read()
        this.push(done ? null : Buffer.from(value))
      } catch (error) {
        this.destroy(error as Error)
      }
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API /api/upload/video - Début du traitement")

    const bucket = await getBucket()
    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const description = formData.get("description") as string

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier vidéo fourni" }, { status: 400 })
    }

    console.log(`🎥 Vidéo reçue: ${file.name}, ${file.size} bytes`)

    // Supprimer l'ancienne vidéo s'il existe
    const client = await clientPromise
    const db = client.db(DBNAME)

    const existingVideo = await db.collection("videos").findOne({ type: "welcome" })
    if (existingVideo && existingVideo.fileId) {
      try {
        await bucket.delete(existingVideo.fileId)
        console.log("🗑️ Ancienne vidéo supprimée")
      } catch (error) {
        console.warn("⚠️ Impossible de supprimer l'ancienne vidéo:", error)
      }
    }

    // Upload de la nouvelle vidéo
    const stream = fileToStream(file)
    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.type,
      metadata: {
        type: "welcome-video",
        originalName: file.name,
        title: title || "Vidéo d'accueil",
        description: description || "",
        size: file.size,
        uploadDate: new Date(),
      },
    })

    await new Promise<void>((resolve, reject) => {
      stream.pipe(uploadStream).on("error", reject).on("finish", resolve)
    })

    const fileId = uploadStream.id.toString()

    // Sauvegarder les métadonnées de la vidéo
    await db.collection("videos").replaceOne(
      { type: "welcome" },
      {
        type: "welcome",
        title: title || "Vidéo d'accueil",
        description: description || "",
        filename: file.name,
        fileId: fileId,
        path: `/api/videos/${fileId}`,
        contentType: file.type,
        size: file.size,
        uploadDate: new Date(),
      },
      { upsert: true },
    )

    console.log(`✅ Vidéo sauvegardée avec l'ID: ${fileId}`)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      filename: file.name,
      fileId: fileId,
      path: `/api/videos/${fileId}`,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'upload de la vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
