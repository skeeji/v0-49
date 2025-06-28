import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("🏷️ API GET /api/logo appelée")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer les informations du logo depuis la collection settings
    const logoSettings = await db.collection("settings").findOne({ key: "logo" })

    if (logoSettings && logoSettings.filename) {
      console.log(`✅ Logo trouvé: ${logoSettings.filename}`)
      return NextResponse.json({
        success: true,
        filename: logoSettings.filename,
        fileId: logoSettings.fileId,
      })
    } else {
      console.log("ℹ️ Aucun logo personnalisé trouvé")
      return NextResponse.json({
        success: false,
        message: "Aucun logo personnalisé trouvé",
      })
    }
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/logo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de la récupération du logo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
