import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    console.log(`🖼️ API /api/images/filename/${params.filename} - Récupération de l'image`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Rechercher le fichier dans GridFS
    const file = await db.collection("uploads.files").findOne({
      filename: params.filename,
    })

    if (!file) {
      console.log(`❌ Image non trouvée: ${params.filename}`)
      return NextResponse.json({ error: "Image non trouvée" }, { status: 404 })
    }

    console.log(`✅ Image trouvée: ${params.filename}`)

    // Récupérer les chunks du fichier
    const chunks = await db.collection("uploads.chunks").find({ files_id: file._id }).sort({ n: 1 }).toArray()

    if (chunks.length === 0) {
      return NextResponse.json({ error: "Données de l'image non trouvées" }, { status: 404 })
    }

    // Reconstituer le fichier
    const buffers = chunks.map((chunk) => chunk.data.buffer)
    const fileBuffer = Buffer.concat(buffers)

    // Déterminer le type MIME
    const contentType = file.metadata?.contentType || "image/jpeg"

    console.log(`📤 Envoi de l'image: ${params.filename} (${fileBuffer.length} bytes)`)

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error: any) {
    console.error(`❌ Erreur récupération image ${params.filename}:`, error)
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de l'image",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
