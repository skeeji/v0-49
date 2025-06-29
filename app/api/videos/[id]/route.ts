import { type NextRequest, NextResponse } from "next/server"
import { downloadFromGridFS } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 })
    }

    const { stream, metadata } = await downloadFromGridFS(id)

    // Créer une réponse avec le stream
    const response = new NextResponse(stream, {
      headers: {
        "Content-Type": metadata.contentType,
        "Content-Length": metadata.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    })

    return response
  } catch (error: any) {
    console.error("❌ Erreur récupération vidéo:", error)
    return NextResponse.json({ error: "Vidéo non trouvée" }, { status: 404 })
  }
}
