import { NextResponse } from "next/server"

// Simulation d'une base de données
const welcomeVideos: any[] = []

export async function GET() {
  try {
    const activeVideo = welcomeVideos.find((video) => video.isActive)

    if (!activeVideo) {
      return NextResponse.json({
        success: false,
        video: null,
      })
    }

    return NextResponse.json({
      success: true,
      video: activeVideo,
    })
  } catch (error) {
    console.error("Erreur lors de la récupération de la vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
      },
      { status: 500 },
    )
  }
}
