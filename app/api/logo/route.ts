import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { downloadFromGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer les métadonnées du logo
    const logoSetting = await db.collection("settings").findOne({ key: "logo" })

    if (!logoSetting || !logoSetting.value?.fileId) {
      return new NextResponse("Logo non trouvé", { status: 404 })
    }

    // Télécharger le fichier depuis GridFS
    const buffer = await downloadFromGridFS(logoSetting.value.fileId)

    // Déterminer le type de contenu
    const filename = logoSetting.value.filename || "logo"
    let contentType = "image/png"
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
      contentType = "image/jpeg"
    } else if (filename.endsWith(".svg")) {
      contentType = "image/svg+xml"
    } else if (filename.endsWith(".gif")) {
      contentType = "image/gif"
    }

    // Retourner le fichier avec les headers appropriés
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur récupération logo:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}
