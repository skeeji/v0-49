import { type NextRequest, NextResponse } from "next/server"
import { uploadToGridFS } from "@/lib/gridfs"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API /api/upload/video - Début upload vidéo")

    const formData = await request.formData()
    const file = (formData.get("video") as File) || (formData.get("file") as File)

    if (!file) {
      console.log("❌ Aucun fichier vidéo fourni")
      console.log("📊 FormData keys:", Array.from(formData.keys()))
      return NextResponse.json(
        {
          success: false,
          error: "Aucun fichier vidéo fourni",
          debug: {
            formDataKeys: Array.from(formData.keys()),
            expectedKeys: ["video", "file"],
          },
        },
        { status: 400 },
      )
    }

    console.log(`📁 Fichier vidéo reçu: ${file.name} (${file.size} bytes, ${file.type})`)

    // Vérifier le type de fichier
    if (!file.type.startsWith("video/")) {
      console.log(`❌ Type de fichier invalide: ${file.type}`)
      return NextResponse.json(
        {
          success: false,
          error: "Le fichier doit être une vidéo",
          receivedType: file.type,
        },
        { status: 400 },
      )
    }

    // Convertir en buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log(`📊 Buffer créé: ${buffer.length} bytes`)

    // Upload vers GridFS
    const fileId = await uploadToGridFS(buffer, file.name, {
      contentType: file.type,
      category: "video",
      originalName: file.name,
    })

    console.log(`✅ Vidéo uploadée vers GridFS: ${fileId}`)

    // Sauvegarder les métadonnées dans MongoDB
    const client = await clientPromise
    const db = client.db(DBNAME)

    await db.collection("settings").updateOne(
      { key: "welcome_video" },
      {
        $set: {
          key: "welcome_video",
          filename: file.name,
          fileId: fileId.toString(),
          contentType: file.type,
          size: file.size,
          uploadDate: new Date(),
        },
      },
      { upsert: true },
    )

    console.log("✅ Métadonnées vidéo sauvegardées")

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      filename: file.name,
      fileId: fileId.toString(),
      size: file.size,
      contentType: file.type,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload vidéo:", error)
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
