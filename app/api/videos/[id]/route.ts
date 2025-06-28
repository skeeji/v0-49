import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const videoId = params.id
    console.log(`🎥 Demande de vidéo: ${videoId}`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "videos" })

    // Rechercher le fichier par ID
    const files = await bucket.find({ _id: new ObjectId(videoId) }).toArray()

    if (files.length === 0) {
      console.log(`❌ Vidéo non trouvée: ${videoId}`)
      return NextResponse.json({ error: "Vidéo non trouvée" }, { status: 404 })
    }

    const file = files[0]
    console.log(`✅ Vidéo trouvée: ${file.filename}, taille: ${file.length} bytes`)

    // Créer un stream pour lire le fichier
    const downloadStream = bucket.openDownloadStream(new ObjectId(videoId))

    // Convertir le stream en buffer
    const chunks: Buffer[] = []

    return new Promise((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        console.log(`📤 Vidéo servie: ${file.filename} (${buffer.length} bytes)`)

        resolve(
          new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": "video/mp4",
              "Cache-Control": "public, max-age=3600",
              "Content-Length": buffer.length.toString(),
              "Accept-Ranges": "bytes",
            },
          }),
        )
      })

      downloadStream.on("error", (error) => {
        console.error(`❌ Erreur lecture vidéo ${videoId}:`, error)
        reject(new NextResponse("Erreur de lecture de la vidéo", { status: 500 }))
      })
    })
  } catch (error: any) {
    console.error(`❌ Erreur dans GET /api/videos/${params.id}:`, error)
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
