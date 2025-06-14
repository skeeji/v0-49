import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { saveUploadedFile, isValidVideoType } from "@/lib/upload"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

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
    const client = await clientPromise
    const db = client.db(DBNAME)

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

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    const welcomeVideo = await db.collection("welcomeVideos").findOne({ isActive: true })

    if (!welcomeVideo) {
      return NextResponse.json({ videoUrl: null })
    }

    return NextResponse.json({ videoUrl: welcomeVideo.videoPath })
  } catch (error) {
    console.error("Erreur lors de la récupération de la vidéo:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
