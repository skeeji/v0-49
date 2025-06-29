import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { downloadFromGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer les métadonnées du logo
    const logoSettings = await db.collection("settings").findOne({ type: "logo" })

    if (!logoSettings || !logoSettings.fileId) {
      return NextResponse.json({ error: "Logo non trouvé" }, { status: 404 })
    }

    // Télécharger le fichier depuis GridFS
    const { stream, metadata } = await downloadFromGridFS(logoSettings.fileId)

    // Créer une réponse avec le stream
    const response = new NextResponse(stream, {
      headers: {
        "Content-Type": metadata.contentType,
        "Content-Length": metadata.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    })

    return response
  } catch (error: any) {
    console.error("❌ Erreur récupération logo:", error)
    return NextResponse.json({ error: "Logo non trouvé" }, { status: 404 })
  }
}
