import { type NextRequest, NextResponse } from "next/server"
import { downloadFromGridFS } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 })
    }

    console.log(`🎬 Streaming vidéo: ${id}`)

    const { stream, metadata } = await downloadFromGridFS(id)

    // Créer une réponse avec le stream
    const response = new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": metadata.contentType,
        "Content-Length": metadata.length.toString(),
        "Cache-Control": "public, max-age=31536000",
        "Accept-Ranges": "bytes",
      },
    })

    return response
  } catch (error: any) {
    console.error("❌ Erreur streaming vidéo:", error)
    return NextResponse.json({ error: "Vidéo non trouvée" }, { status: 404 })
  }
}
