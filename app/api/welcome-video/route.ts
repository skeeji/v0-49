import { type NextRequest, NextResponse } from "next/server"

// Simulation d'une base de données
const welcomeVideos: any[] = []

export async function GET(request: NextRequest) {
  try {
    // Return a simple welcome message or video URL
    return NextResponse.json({
      success: true,
      message: "Bienvenue dans la galerie de luminaires",
      videoUrl: null, // Add video URL if needed
    })
  } catch (error) {
    console.error("Error in welcome-video route:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
      },
      { status: 500 },
    )
  }
}
