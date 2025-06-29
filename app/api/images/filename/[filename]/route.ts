import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = params.filename
    console.log("🔍 API /api/images/filename/[filename] GET - Filename:", filename)

    if (!filename) {
      console.log("❌ Nom de fichier manquant")
      return new NextResponse("Nom de fichier manquant", { status: 400 })
    }

    const bucket = await getBucket()

    // Rechercher le fichier par nom
    const files = await bucket.find({ filename: filename }).toArray()

    if (!files || files.length === 0) {
      console.log("❌ Fichier non trouvé:", filename)
      return new NextResponse("Fichier non trouvé", { status: 404 })
    }

    // Utiliser le premier fichier trouvé (devrait être unique)
    const file = files[0]
    console.log("✅ Fichier trouvé:", file.filename, file._id)

    const downloadStream = bucket.openDownloadStream(file._id)

    console.log("✅ Stream ouvert pour le fichier:", file.filename)

    return new NextResponse(downloadStream as any)
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/images/filename/[filename]:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
