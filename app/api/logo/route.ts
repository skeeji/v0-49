import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getBucket } from "@/lib/gridfs"

export async function GET() {
  try {
    console.log("🖼️ API logo: Recherche du logo...")
    const db = await getDatabase()
    const bucket = await getBucket()

    // Chercher le logo le plus récent
    const logo = await db.collection("logos").findOne({}, { sort: { uploadDate: -1 } })

    if (!logo) {
      console.log("⚠️ Aucun logo trouvé")
      return NextResponse.json({ error: "Logo non trouvé" }, { status: 404 })
    }

    console.log("📁 Logo trouvé, récupération du fichier GridFS:", logo.fileId)

    // Récupérer le fichier depuis GridFS
    const downloadStream = bucket.openDownloadStream(new ObjectId(logo.fileId))

    // Convertir le stream en buffer
    const chunks: Buffer[] = []

    return new Promise((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        console.log("✅ Logo récupéré, taille:", buffer.length, "bytes")

        const response = new NextResponse(buffer, {
          headers: {
            "Content-Type": logo.contentType || "image/png",
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=31536000",
          },
        })
        resolve(response)
      })

      downloadStream.on("error", (error) => {
        console.error("❌ Erreur lecture GridFS:", error)
        reject(NextResponse.json({ error: "Erreur lecture fichier" }, { status: 500 }))
      })
    })
  } catch (error) {
    console.error("❌ Erreur API logo:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
