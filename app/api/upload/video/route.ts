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
      console.log("❌ Aucun fichier vidéo fourni")
      return NextResponse.json({ error: "Aucun fichier vidéo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier vidéo reçu: ${file.name} (${file.size} bytes)`)

    // Vérifier le type de fichier
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Le fichier doit être une vidéo" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Convertir le fichier en buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`📤 Upload vers GridFS: ${file.name}`)

    // Upload vers GridFS
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        contentType: file.type,
        uploadDate: new Date(),
        type: "video",
        originalName: file.name,
      },
    })

    const fileId = await new Promise((resolve, reject) => {
      uploadStream.on("error", (error) => {
        console.error("❌ Erreur upload vidéo:", error)
        reject(error)
      })

      uploadStream.on("finish", () => {
        console.log(`✅ Vidéo uploadée: ${file.name} - ID: ${uploadStream.id}`)
        resolve(uploadStream.id)
      })

      uploadStream.end(buffer)
    })

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      filename: file.name,
      fileId: fileId.toString(),
      size: file.size,
      type: file.type,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload vidéo:", error)
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
