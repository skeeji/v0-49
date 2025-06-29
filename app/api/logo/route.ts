import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    const logo = await db.collection("settings").findOne({ type: "logo" })

    if (!logo) {
      return NextResponse.json({ success: false, error: "Aucun logo trouvé" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      logo: {
        _id: logo._id,
        filename: logo.filename,
        path: logo.path,
        fileId: logo.fileId,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur récupération logo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération du logo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
