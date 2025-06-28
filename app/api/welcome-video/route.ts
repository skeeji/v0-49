import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("🎥 API GET /api/welcome-video appelée")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer la vidéo de bienvenue depuis la collection welcomeVideos
    const video = await db.collection("welcomeVideos").findOne({}, { sort: { uploadedAt: -1 } })

    if (video) {
      console.log(`✅ Vidéo de bienvenue trouvée: ${video.title}`)
      return NextResponse.json({
        success: true,
        video: {
          _id: video._id.toString(),
          title: video.title,
          description: video.description,
          fileId: video.fileId,
          uploadedAt: video.uploadedAt,
        },
      })
    } else {
      console.log("ℹ️ Aucune vidéo de bienvenue trouvée")
      return NextResponse.json({
        success: false,
        message: "Aucune vidéo de bienvenue trouvée",
      })
    }
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/welcome-video:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de la récupération de la vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
