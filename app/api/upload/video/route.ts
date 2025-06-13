import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { saveUploadedFile, isValidVideoType } from "@/lib/upload"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const description = formData.get("description") as string

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    if (!isValidVideoType(file.name)) {
      return NextResponse.json({ error: "Type de fichier vidéo non supporté" }, { status: 400 })
    }

    // Sauvegarder le fichier
    const filePath = await saveUploadedFile(file, "videos")

    // Sauvegarder les informations en base
    const db = await getDatabase()

    // Désactiver les autres vidéos
    await db.collection("welcomeVideos").updateMany({}, { $set: { isActive: false } })

    // Créer la nouvelle vidéo
    const welcomeVideo = {
      title: title || "Vidéo de bienvenue",
      description: description || "",
      videoPath: filePath,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("welcomeVideos").insertOne(welcomeVideo)

    return NextResponse.json({
      _id: result.insertedId,
      ...welcomeVideo,
      message: "Vidéo uploadée avec succès",
    })
  } catch (error) {
    console.error("Erreur lors de l'upload de vidéo:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
