import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API /api/upload/video - Upload vidéo")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("❌ Aucun fichier vidéo fourni")
      return NextResponse.json({ error: "Aucun fichier vidéo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier vidéo reçu: ${file.name} (${file.size} bytes)`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Supprimer l'ancienne vidéo s'il y en a une
    try {
      const existingFiles = await bucket.find({ "metadata.type": "video" }).toArray()
      for (const existingFile of existingFiles) {
        await bucket.delete(existingFile._id)
        console.log(`🗑️ Ancienne vidéo supprimée: ${existingFile.filename}`)
      }
    } catch (error) {
      console.log("⚠️ Aucune ancienne vidéo à supprimer")
    }

    // Upload de la nouvelle vidéo
    const buffer = Buffer.from(await file.arrayBuffer())

    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.type,
      metadata: {
        type: "video",
        originalName: file.name,
        uploadDate: new Date(),
      },
    })

    await new Promise((resolve, reject) => {
      uploadStream.on("error", reject)
      uploadStream.on("finish", resolve)
      uploadStream.end(buffer)
    })

    const fileId = uploadStream.id.toString()
    console.log(`✅ Vidéo uploadée avec l'ID: ${fileId}`)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      filename: file.name,
      fileId: fileId,
      size: file.size,
      url: `/api/videos/${fileId}`,
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
