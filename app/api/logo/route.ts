import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { streamFile } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer les infos du logo depuis settings
    const logoSetting = await db.collection("settings").findOne({ key: "logo" })

    if (!logoSetting || !logoSetting.value?.fileId) {
      return NextResponse.json({ error: "Logo non trouvé" }, { status: 404 })
    }

    // Créer le stream
    const downloadStream = await streamFile(logoSetting.value.fileId)

    // Créer une réponse avec le stream
    const response = new NextResponse(downloadStream as any, {
      status: 200,
      headers: {
        "Content-Type": logoSetting.value.contentType || "image/png",
        "Cache-Control": "public, max-age=31536000",
        "Content-Disposition": `inline; filename="${logoSetting.value.filename}"`,
      },
    })

    return response
  } catch (error: any) {
    console.error("❌ Erreur récupération logo:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération du logo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
