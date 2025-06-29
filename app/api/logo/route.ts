import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { streamFile, getFileInfo } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer les métadonnées du logo
    const logoSetting = await db.collection("settings").findOne({ key: "logo" })

    if (!logoSetting || !logoSetting.value?.fileId) {
      return NextResponse.json({ error: "Logo non trouvé" }, { status: 404 })
    }

    const fileId = logoSetting.value.fileId

    // Récupérer les infos du fichier
    const fileInfo = await getFileInfo(fileId)
    if (!fileInfo) {
      return NextResponse.json({ error: "Fichier logo non trouvé" }, { status: 404 })
    }

    // Créer le stream
    const downloadStream = await streamFile(fileId)

    // Créer une réponse avec stream
    const response = new Response(downloadStream as any, {
      headers: {
        "Content-Type": fileInfo.metadata?.contentType || "image/png",
        "Content-Length": fileInfo.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    })

    return response
  } catch (error: any) {
    console.error("❌ Erreur récupération logo:", error)
    return NextResponse.json(
      {
        error: "Erreur serveur lors de la récupération du logo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
