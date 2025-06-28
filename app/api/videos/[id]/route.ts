import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getBucket } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log(`🎥 Récupération de la vidéo: ${id}`)

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "ID vidéo invalide" }, { status: 400 })
    }

    const bucket = await getBucket()
    const objectId = new ObjectId(id)

    // Vérifier que le fichier existe
    const fileInfo = await bucket.find({ _id: objectId }).toArray()
    if (fileInfo.length === 0) {
      return NextResponse.json({ success: false, error: "Vidéo non trouvée" }, { status: 404 })
    }

    const file = fileInfo[0]
    console.log(`📁 Fichier trouvé: ${file.filename}, taille: ${file.length} bytes`)

    // Créer un stream de lecture depuis GridFS
    const downloadStream = bucket.openDownloadStream(objectId)

    // Gérer les erreurs du stream
    downloadStream.on("error", (error) => {
      console.error("❌ Erreur stream vidéo:", error)
    })

    // Convertir le stream en Response
    const readableStream = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk) => {
          controller.enqueue(new Uint8Array(chunk))
        })

        downloadStream.on("end", () => {
          controller.close()
        })

        downloadStream.on("error", (error) => {
          controller.error(error)
        })
      },
    })

    // Retourner la vidéo avec les bons headers
    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": file.metadata?.contentType || "video/mp4",
        "Content-Length": file.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur récupération vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération de la vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
