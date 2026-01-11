import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    const fileId = new ObjectId(params.id)
    const downloadStream = bucket.openDownloadStream(fileId)

    // Récupérer les métadonnées du fichier
    const fileInfo = await db.collection("uploads.files").findOne({ _id: fileId })

    if (!fileInfo) {
      return new NextResponse("Image non trouvée", { status: 404 })
    }

    const contentType = fileInfo.metadata?.contentType || "image/jpeg"

    // Convertir le stream en buffer
    const chunks: Buffer[] = []

    return new Promise((resolve) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        resolve(
          new NextResponse(buffer, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000",
            },
          }),
        )
      })

      downloadStream.on("error", () => {
        resolve(new NextResponse("Erreur lors de la lecture de l'image", { status: 500 }))
      })
    })
  } catch (error) {
    console.error("Erreur API image période:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}
