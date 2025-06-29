import { type NextRequest, NextResponse } from "next/server"
import { streamFile, getFileInfo } from "@/lib/gridfs"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 })
    }

    // Récupérer les infos du fichier
    const fileInfo = await getFileInfo(id)
    if (!fileInfo) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 })
    }

    // Créer le stream
    const downloadStream = await streamFile(id)

    // Créer une réponse avec stream
    const response = new Response(downloadStream as any, {
      headers: {
        "Content-Type": fileInfo.metadata?.contentType || "video/mp4",
        "Content-Length": fileInfo.length.toString(),
        "Cache-Control": "public, max-age=31536000",
        "Accept-Ranges": "bytes",
      },
    })

    return response
  } catch (error: any) {
    console.error("❌ Erreur streaming vidéo:", error)
    return NextResponse.json(
      {
        error: "Erreur serveur lors du streaming",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
