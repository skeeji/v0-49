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
      return NextResponse.json({ error: "Aucun fichier vidéo fourni" }, { status: 400 })
    }

    console.log(`📁 Vidéo reçue: ${file.name}, taille: ${file.size} bytes`)

    // Convertir le fichier en buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload vers GridFS
    const fileId = await uploadFile(buffer, file.name, {
      contentType: file.type,
      size: file.size,
      category: "video",
      title: title || "Vidéo d'accueil",
      description: description || "",
    })

    // Sauvegarder les métadonnées de la vidéo dans settings
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
            url: `/api/videos/${fileId}`,
            contentType: file.type,
            size: file.size,
            title: title || "Vidéo d'accueil",
            description: description || "",
            uploadDate: new Date(),
          },
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    console.log(`✅ Vidéo sauvegardée: ${file.name} (ID: ${fileId})`)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      filename: file.name,
      fileId: fileId.toString(),
      url: `/api/videos/${fileId}`,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload de la vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
