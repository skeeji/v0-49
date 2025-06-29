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
      console.log("❌ Aucun fichier vidéo trouvé dans la requête")
      return NextResponse.json({ success: false, error: "Aucun fichier vidéo trouvé" }, { status: 400 })
    }

    console.log(`📁 Vidéo reçue: ${file.name} (${file.size} bytes)`)

    const bucket = await getBucket()

    // Upload vers GridFS
    const stream = fileToStream(file)
    const uploadStream = bucket.openUploadStream(`video_${Date.now()}_${file.name}`, {
      contentType: file.type,
    })

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", () => resolve())
    })

    const fileId = uploadStream.id.toString()
    console.log(`✅ Vidéo uploadée avec l'ID: ${fileId}`)

    // Sauvegarder les métadonnées en base
    const client = await clientPromise
    const db = client.db(DBNAME)

    const videoData = {
      filename: file.name,
      fileId: fileId,
      path: `/api/images/${fileId}`,
      title: title || "Vidéo d'accueil",
      description: description || "Vidéo de bienvenue",
      size: file.size,
      contentType: file.type,
      uploadedAt: new Date(),
    }

    await db.collection("videos").insertOne(videoData)

    console.log(`✅ Métadonnées vidéo sauvegardées`)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      filename: file.name,
      fileId: fileId,
      path: `/api/images/${fileId}`,
      title: videoData.title,
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
