import { type NextRequest, NextResponse } from "next/server"
import { downloadFromGridFS, getFileInfo } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return new NextResponse("ID manquant", { status: 400 })
    }

    // Récupérer les informations du fichier
    const fileInfo = await getFileInfo(id)
    if (!fileInfo) {
      return new NextResponse("Fichier non trouvé", { status: 404 })
    }

    // Télécharger le fichier depuis GridFS
    const buffer = await downloadFromGridFS(id)

    // Retourner le fichier avec les headers appropriés
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": fileInfo.metadata?.contentType || "video/mp4",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000",
        "Accept-Ranges": "bytes",
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur streaming vidéo:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}
