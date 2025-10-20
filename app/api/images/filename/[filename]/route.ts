import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = decodeURIComponent(params.filename)
    console.log(`🖼️  API /api/images/filename/${filename} - Recherche de l'image`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Chercher le fichier dans uploads.files
    const file = await db.collection("uploads.files").findOne({ filename })

    if (!file) {
      console.log(`❌ Image non trouvée: ${filename}`)
      return new NextResponse("Image non trouvée", { status: 404 })
    }

    console.log(`✅ Image trouvée: ${filename}, contentType: ${file.contentType || file.metadata?.contentType}`)

    // Streamer l'image depuis GridFS
    const downloadStream = bucket.openDownloadStreamByName(filename)

    // Convertir le stream en buffer
    const chunks: Buffer[] = []
    for await (const chunk of downloadStream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Déterminer le content type
    const contentType = file.contentType || file.metadata?.contentType || "image/jpeg"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error: any) {
    console.error(`❌ Erreur lors de la récupération de l'image ${params.filename}:`, error)
    return new NextResponse("Erreur lors de la récupération de l'image", { status: 500 })
  }
}
