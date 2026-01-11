import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getBucket } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🎥 API videos/[id]: Récupération vidéo ID:", params.id)

    const db = await getDatabase()
    const bucket = await getBucket()

    // Chercher la vidéo par ID
    const video = await db.collection("videos").findOne({ _id: new ObjectId(params.id) })

    if (!video) {
      console.log("❌ Vidéo non trouvée")
      return NextResponse.json({ error: "Vidéo non trouvée" }, { status: 404 })
    }

    console.log("📁 Vidéo trouvée, récupération du fichier GridFS:", video.fileId)

    // Récupérer le fichier depuis GridFS
    const downloadStream = bucket.openDownloadStream(new ObjectId(video.fileId))

    // Convertir le stream en buffer
    const chunks: Buffer[] = []

    return new Promise((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        console.log("✅ Vidéo récupérée, taille:", buffer.length, "bytes")

        const response = new NextResponse(buffer, {
          headers: {
            "Content-Type": video.contentType || "video/mp4",
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
    console.error("❌ Erreur API videos/[id]:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
