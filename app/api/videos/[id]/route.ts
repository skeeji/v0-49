import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 })
    }

    const bucket = await getBucket()
    const objectId = new ObjectId(id)

    // Vérifier que le fichier existe
    const file = await bucket.find({ _id: objectId }).next()
    if (!file) {
      return NextResponse.json({ error: "Vidéo non trouvée" }, { status: 404 })
    }

    // Créer un stream de téléchargement
    const downloadStream = bucket.openDownloadStream(objectId)

    // Créer une réponse avec le stream
    const response = new NextResponse(downloadStream as any, {
      headers: {
        "Content-Type": file.contentType || "video/mp4",
        "Content-Length": file.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    })

    return response
  } catch (error: any) {
    console.error("❌ Erreur récupération vidéo:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
