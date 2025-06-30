import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    console.log("🎥 API welcome-video: Recherche de la vidéo...")
    const db = await getDatabase()

    // Chercher la vidéo la plus récente
    const video = await db.collection("videos").findOne({}, { sort: { uploadDate: -1 } })

    if (video) {
      console.log("✅ Vidéo trouvée:", video._id)
      return NextResponse.json({
        success: true,
        video: {
          _id: video._id,
          filename: video.filename,
          uploadDate: video.uploadDate,
        },
      })
    } else {
      console.log("⚠️ Aucune vidéo trouvée")
      return NextResponse.json({
        success: false,
        message: "Aucune vidéo trouvée",
      })
    }
  } catch (error) {
    console.error("❌ Erreur API welcome-video:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erreur serveur",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
