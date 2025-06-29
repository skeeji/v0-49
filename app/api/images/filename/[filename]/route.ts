import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getFileFromGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    console.log(`🖼️ API /api/images/filename/${params.filename} - Récupération de l'image`)

    const filename = decodeURIComponent(params.filename)
    console.log(`🔍 Recherche de l'image: ${filename}`)

    const client = await clientPromise
    const fileData = await getFileFromGridFS(client, DBNAME, filename)

    if (!fileData) {
      console.log(`❌ Image non trouvée: ${filename}`)
      return NextResponse.json({ error: "Image non trouvée" }, { status: 404 })
    }

    console.log(`✅ Image trouvée: ${filename} (${fileData.buffer.length} bytes)`)

    // Retourner l'image avec les bons headers
    return new NextResponse(fileData.buffer, {
      status: 200,
      headers: {
        "Content-Type": fileData.contentType,
        "Content-Length": fileData.buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
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
