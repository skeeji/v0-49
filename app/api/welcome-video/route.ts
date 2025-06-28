import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("🎥 API GET /api/welcome-video appelée")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer la vidéo de bienvenue
    const video = await db.collection("welcome_videos").findOne({}, { sort: { createdAt: -1 } })

    if (!video) {
      console.log("ℹ️ Aucune vidéo de bienvenue trouvée")
      return NextResponse.json({
        success: true,
        video: null,
        message: "Aucune vidéo de bienvenue configurée",
      })
    }

    console.log("✅ Vidéo de bienvenue trouvée:", video.filename)

    return NextResponse.json({
      success: true,
      video: {
        ...video,
        _id: video._id.toString(),
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/welcome-video:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
