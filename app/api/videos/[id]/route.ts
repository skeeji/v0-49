import { type NextRequest, NextResponse } from "next/server"
import { streamFile, getFileInfo } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 })
    }

    // Récupérer les infos du fichier
    const fileInfo = await getFileInfo(id)
    if (!fileInfo) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 })
    }

    // Créer le stream
    const downloadStream = await streamFile(id)

    // Créer une réponse avec le stream
    const response = new NextResponse(downloadStream as any, {
      status: 200,
      headers: {
        "Content-Type": fileInfo.metadata?.contentType || "video/mp4",
        "Content-Length": fileInfo.length?.toString() || "0",
        "Cache-Control": "public, max-age=31536000",
        "Content-Disposition": `inline; filename="${fileInfo.filename}"`,
      },
    })

    return response
  } catch (error: any) {
    console.error("❌ Erreur streaming vidéo:", error)
    return NextResponse.json(
      {
        error: "Erreur lors du streaming de la vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
