import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🎥 API GET /api/videos/${params.id} appelée`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer les informations de la vidéo
    const video = await db.collection("welcomeVideos").findOne({ _id: new ObjectId(params.id) })

    if (!video) {
      console.log(`❌ Vidéo non trouvée: ${params.id}`)
      return NextResponse.json({ error: "Vidéo non trouvée" }, { status: 404 })
    }

    // Créer le bucket GridFS
    const bucket = new GridFSBucket(db, { bucketName: "videos" })

    // Ouvrir le stream de téléchargement
    const downloadStream = bucket.openDownloadStream(new ObjectId(video.fileId))

    // Convertir le stream en buffer
    const chunks: Buffer[] = []

    return new Promise<NextResponse>((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        console.log(`✅ Vidéo servie: ${video.title} (${buffer.length} bytes)`)

        resolve(
          new NextResponse(buffer, {
            headers: {
              "Content-Type": "video/mp4",
              "Cache-Control": "public, max-age=31536000, immutable",
              "Content-Length": buffer.length.toString(),
            },
          }),
        )
      })

      downloadStream.on("error", (error) => {
        console.error(`❌ Erreur lecture vidéo ${params.id}:`, error)
        reject(new NextResponse("Erreur lors de la lecture de la vidéo", { status: 500 }))
      })
    })
  } catch (error: any) {
    console.error(`❌ Erreur dans GET /api/videos/${params.id}:`, error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
