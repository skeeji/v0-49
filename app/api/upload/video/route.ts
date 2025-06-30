import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { uploadFile } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API upload/video: Début upload vidéo")

    const formData = await request.formData()
    const file = formData.get("video") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier vidéo fourni" })
    }

    console.log(`📁 Fichier vidéo reçu: ${file.name}, taille: ${file.size} bytes, type: ${file.type}`)

    // Vérifier le type de fichier
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ success: false, error: "Le fichier doit être une vidéo" })
    }

    const db = await getDatabase()

    // Supprimer l'ancienne vidéo s'il y en a une
    const oldVideo = await db.collection("videos").findOne({})
    if (oldVideo) {
      console.log("🗑️ Suppression de l'ancienne vidéo")
      await db.collection("videos").deleteOne({ _id: oldVideo._id })
      // TODO: Supprimer aussi le fichier GridFS
    }

    // Convertir le fichier en buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Uploader vers GridFS
    console.log("📤 Upload vers GridFS...")
    const fileId = await uploadFile(file.name, buffer, file.type)
    console.log("✅ Fichier uploadé vers GridFS, ID:", fileId)

    // Sauvegarder les métadonnées en base
    const videoDoc = {
      filename: file.name,
      fileId: fileId,
      contentType: file.type,
      size: file.size,
      uploadDate: new Date(),
    }

    const result = await db.collection("videos").insertOne(videoDoc)
    console.log("✅ Métadonnées vidéo sauvegardées, ID:", result.insertedId)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      videoId: result.insertedId,
    })
  } catch (error) {
    console.error("❌ Erreur upload vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
