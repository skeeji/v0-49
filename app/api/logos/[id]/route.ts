import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    const bucket = new GridFSBucket(db, { bucketName: "logos" })

    const logoId = new ObjectId(params.id)
    const downloadStream = bucket.openDownloadStream(logoId)

    // Obtenir les métadonnées du fichier
    const fileInfo = await db.collection("logos.files").findOne({ _id: logoId })

    if (!fileInfo) {
      return NextResponse.json({ error: "Logo non trouvé" }, { status: 404 })
    }

    const chunks: Buffer[] = []

    return new Promise((resolve) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        const response = new NextResponse(buffer)
        response.headers.set("Content-Type", fileInfo.metadata?.contentType || "image/png")
        response.headers.set("Cache-Control", "public, max-age=31536000")
        resolve(response)
      })

      downloadStream.on("error", () => {
        resolve(NextResponse.json({ error: "Erreur lors de la lecture du logo" }, { status: 500 }))
      })
    })
  } catch (error) {
    console.error("❌ Erreur récupération logo:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
