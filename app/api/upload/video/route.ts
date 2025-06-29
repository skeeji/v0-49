import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { uploadFile } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/video - Début du traitement")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const description = formData.get("description") as string

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Vidéo reçue: ${file.name} (${file.size} bytes)`)

    // Convertir en Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Uploader vers GridFS
    const fileId = await uploadFile(buffer, file.name, {
      contentType: file.type,
      originalName: file.name,
      size: file.size,
      type: "video",
      title: title || "Vidéo d'accueil",
      description: description || "",
    })

    // Sauvegarder les métadonnées dans settings
    const client = await clientPromise
    const db = client.db(DBNAME)

    await db.collection("settings").updateOne(
      { key: "welcome_video" },
      {
        $set: {
          key: "welcome_video",
          value: {
            fileId: fileId.toString(),
            filename: file.name,
            contentType: file.type,
            size: file.size,
            title: title || "Vidéo d'accueil",
            description: description || "",
          },
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    console.log(`✅ Vidéo sauvegardée: ${file.name}`)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      filename: file.name,
      fileId: fileId.toString(),
    })
  } catch (error: any) {
    console.error("❌ Erreur upload vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
