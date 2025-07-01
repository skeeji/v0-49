import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "period-images" })

    const fileId = new ObjectId(params.id)
    const downloadStream = bucket.openDownloadStream(fileId)

    // Récupérer les métadonnées du fichier
    const fileInfo = await bucket.find({ _id: fileId }).next()

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

      downloadStream.on("error", (error) => {
        console.error("Erreur lecture image période:", error)
        resolve(new NextResponse("Erreur lecture image", { status: 500 }))
      })
    })
  } catch (error: any) {
    console.error("Erreur API image période:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}
