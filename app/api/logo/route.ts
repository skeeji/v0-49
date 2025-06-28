import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getBucket } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer les métadonnées du logo
    const logoSettings = await db.collection("settings").findOne({ type: "logo" })

    if (!logoSettings || !logoSettings.fileId) {
      return NextResponse.json({ success: false, error: "Aucun logo trouvé" }, { status: 404 })
    }

    const bucket = await getBucket()

    // Créer un stream de lecture depuis GridFS
    const downloadStream = bucket.openDownloadStream(logoSettings.fileId)

    // Convertir le stream en buffer
    const chunks: Buffer[] = []
    for await (const chunk of downloadStream) {
      chunks.push(chunk)
    }
    const logoBuffer = Buffer.concat(chunks)

    // Retourner l'image avec les bons headers
    return new NextResponse(logoBuffer, {
      headers: {
        "Content-Type": logoSettings.contentType || "image/png",
        "Content-Length": logoBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000",
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
