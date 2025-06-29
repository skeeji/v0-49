import { type NextRequest, NextResponse } from "next/server"

// Simulation d'une base de données
const welcomeVideos: any[] = []

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const description = formData.get("description") as string

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Type de fichier vidéo non supporté" }, { status: 400 })
    }

    // Simulation de sauvegarde du fichier
    const filePath = `/uploads/videos/${Date.now()}-${file.name}`

    // Désactiver les autres vidéos
    welcomeVideos.forEach((video) => (video.isActive = false))

    // Créer la nouvelle vidéo
    const welcomeVideo = {
      _id: Date.now().toString(),
      title: title || "Vidéo de bienvenue",
      description: description || "",
      videoPath: filePath,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    welcomeVideos.push(welcomeVideo)

    return NextResponse.json({
      _id: welcomeVideo._id,
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
    const welcomeVideo = welcomeVideos.find((video) => video.isActive)

    if (!welcomeVideo) {
      return NextResponse.json({ videoUrl: null })
    }

    return NextResponse.json({ videoUrl: welcomeVideo.videoPath })
  } catch (error) {
    console.error("Erreur lors de la récupération de la vidéo:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
