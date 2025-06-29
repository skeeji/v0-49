import { type NextRequest, NextResponse } from "next/server"
import { streamFile, findFileByName } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = decodeURIComponent(params.filename)
    console.log(`🖼️ API /api/images/filename/${filename} - Récupération image`)

    // Chercher le fichier par nom
    const fileInfo = await findFileByName(filename)

    if (!fileInfo) {
      console.log(`❌ Image non trouvée: ${filename}`)
      return NextResponse.json(
        {
          success: false,
          error: "Image non trouvée",
        },
        { status: 404 },
      )
    }

    console.log(`✅ Image trouvée: ${filename} (${fileInfo.length} bytes)`)

    // Créer un stream pour le fichier
    const downloadStream = await streamFile(fileInfo._id)

    // Créer une réponse avec le stream
    const response = new NextResponse(downloadStream as any, {
      headers: {
        "Content-Type": fileInfo.contentType || "image/jpeg",
        "Content-Length": fileInfo.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    })

    return response
  } catch (error: any) {
    console.error(`❌ Erreur récupération image ${params.filename}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de la récupération de l'image",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
