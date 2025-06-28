import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("🎥 Récupération de la vidéo de bienvenue...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer la vidéo de bienvenue la plus récente
    const video = await db.collection("welcomeVideos").findOne({}, { sort: { uploadedAt: -1 } })

    if (!video) {
      return NextResponse.json({ success: false, error: "Aucune vidéo de bienvenue trouvée" }, { status: 404 })
    }

    console.log(`✅ Vidéo trouvée: ${video.title}`)

    return NextResponse.json({
      success: true,
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        filename: video.filename,
        uploadedAt: video.uploadedAt,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur récupération vidéo de bienvenue:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération de la vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
