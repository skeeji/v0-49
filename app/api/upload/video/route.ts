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

    console.log(`📤 Upload de la vidéo: ${file.name}, taille: ${file.size} bytes`)

    // Upload vers GridFS
    const stream = fileToStream(file)
    const uploadStream = bucket.openUploadStream(`video_${Date.now()}_${file.name}`, {
      contentType: file.type,
      metadata: {
        type: "video",
        title: title || "Vidéo d'accueil",
        description: description || "",
        originalName: file.name,
        size: file.size,
        uploadDate: new Date(),
      },
    })

    await new Promise<void>((resolve, reject) => {
      stream.pipe(uploadStream).on("error", reject).on("finish", resolve)
    })

    const fileId = uploadStream.id.toString()

    // Sauvegarder les métadonnées de la vidéo
    const client = await clientPromise
    const db = client.db(DBNAME)

    await db.collection("videos").deleteMany({}) // Supprimer l'ancienne vidéo
    await db.collection("videos").insertOne({
      fileId: fileId,
      filename: file.name,
      originalName: file.name,
      title: title || "Vidéo d'accueil",
      description: description || "",
      contentType: file.type,
      size: file.size,
      path: `/api/images/${fileId}`,
      createdAt: new Date(),
      isActive: true,
    })

    console.log(`✅ Vidéo uploadée avec l'ID: ${fileId}`)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      fileId: fileId,
      filename: file.name,
      title: title,
      path: `/api/images/${fileId}`,
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
