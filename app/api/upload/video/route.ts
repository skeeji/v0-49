import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { uploadToGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/video - Début du traitement")

    const formData = await request.formData()
    const file = (formData.get("video") as File) || (formData.get("file") as File)
    const title = formData.get("title") as string
    const description = formData.get("description") as string

    if (!file) {
      console.log("❌ Aucun fichier vidéo trouvé dans FormData")
      console.log("📋 Clés disponibles:", Array.from(formData.keys()))
      return NextResponse.json({ error: "Aucun fichier vidéo fourni" }, { status: 400 })
    }

    console.log(`📁 Vidéo reçue: ${file.name}, taille: ${file.size} bytes`)

    // Convertir le fichier en buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload vers GridFS
    const fileId = await uploadToGridFS(buffer, file.name, {
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
      { key: "welcomeVideo" },
      {
        $set: {
          key: "welcomeVideo",
          value: {
            fileId: fileId.toString(),
            filename: file.name,
            title: title || "Vidéo d'accueil",
            description: description || "",
            url: `/api/videos/${fileId}`,
            uploadDate: new Date(),
          },
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
        error: "Erreur lors de l'upload de la vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
