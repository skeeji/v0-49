import { type NextRequest, NextResponse } from "next/server"
import { uploadToGridFS } from "@/lib/gridfs"

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API /api/upload/video - Début du traitement")

    const formData = await request.formData()

    // Essayer différents noms de champs
    let videoFile = formData.get("video") as File
    if (!videoFile) {
      videoFile = formData.get("file") as File
    }
    if (!videoFile) {
      videoFile = formData.get("videos") as File
    }

    console.log("📁 Fichier vidéo reçu:", videoFile?.name, videoFile?.size)

    if (!videoFile) {
      console.log("❌ Aucun fichier vidéo fourni")
      return NextResponse.json({ error: "Aucun fichier vidéo fourni" }, { status: 400 })
    }

    // Vérifier le type de fichier
    if (!videoFile.type.startsWith("video/")) {
      console.log("❌ Type de fichier invalide:", videoFile.type)
      return NextResponse.json({ error: "Le fichier doit être une vidéo" }, { status: 400 })
    }

    console.log(`📁 Upload vidéo: ${videoFile.name} (${videoFile.size} bytes)`)

    // Convertir le fichier en buffer
    const buffer = Buffer.from(await videoFile.arrayBuffer())

    // Upload vers GridFS
    const fileId = await uploadToGridFS(buffer, videoFile.name, {
      contentType: videoFile.type,
      originalName: videoFile.name,
      size: videoFile.size,
      category: "video",
    })

    console.log(`✅ Vidéo uploadée avec l'ID: ${fileId}`)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      filename: videoFile.name,
      fileId: fileId.toString(),
      url: `/api/videos/${fileId}`,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'upload vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
