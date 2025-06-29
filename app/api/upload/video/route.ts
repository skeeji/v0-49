import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"
import { Readable } from "stream"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

function fileToStream(file: File) {
  const reader = file.stream().getReader()
  return new Readable({
    async read() {
      const { done, value } = await reader.read()
      this.push(done ? null : Buffer.from(value))
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API POST /api/upload/video appelée")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const description = formData.get("description") as string

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier vidéo fourni" }, { status: 400 })
    }

    console.log(`📁 Vidéo reçue: ${file.name}, taille: ${file.size} bytes`)

    const bucket = await getBucket()
    const stream = fileToStream(file)
    const filename = `video_${Date.now()}_${file.name}`

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.type,
    })

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", () => resolve())
    })

    const fileId = uploadStream.id.toString()

    // Sauvegarder les informations de la vidéo en base
    const client = await clientPromise
    const db = client.db(DBNAME)

    await db.collection("videos").deleteMany({}) // Supprimer l'ancienne vidéo
    await db.collection("videos").insertOne({
      filename: filename,
      originalName: file.name,
      fileId: fileId,
      path: `/api/images/${fileId}`,
      title: title || "Vidéo d'accueil",
      description: description || "Vidéo de bienvenue",
      contentType: file.type,
      size: file.size,
      createdAt: new Date(),
    })

    console.log(`✅ Vidéo uploadée avec l'ID: ${fileId}`)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      filename: filename,
      fileId: fileId,
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
