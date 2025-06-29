import { type NextRequest, NextResponse } from "next/server"
import { uploadToGridFS } from "@/lib/gridfs"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/video - Début du traitement")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`🎥 Vidéo à uploader: ${file.name} ${file.size} bytes`)

    // Vérifier que c'est bien une vidéo MP4
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ success: false, error: "Le fichier doit être une vidéo" }, { status: 400 })
    }

    // Convertir le fichier en buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload vers GridFS
    const fileId = await uploadToGridFS(buffer, file.name, file.type)

    // Sauvegarder les métadonnées de la vidéo
    const client = await clientPromise
    const db = client.db(DBNAME)

    await db.collection("settings").updateOne(
      { type: "welcome-video" },
      {
        $set: {
          type: "welcome-video",
          fileId: fileId.toString(),
          filename: file.name,
          contentType: file.type,
          size: file.size,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    console.log(`🎥 Vidéo sauvegardée: ${file.name}`)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      fileId: fileId.toString(),
      filename: file.name,
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
