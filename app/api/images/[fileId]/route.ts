import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getBucket } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const fileId = params.fileId
    console.log("🔍 API /api/images/[fileId] GET - ID:", fileId)

    if (!ObjectId.isValid(fileId)) {
      console.log("❌ ID invalide:", fileId)
      return new NextResponse("ID invalide", { status: 400 })
    }

    const bucket = await getBucket()
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId))

    console.log("✅ Stream ouvert pour l'ID:", fileId)

    return new NextResponse(downloadStream as any)
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/images/[fileId]:", error)
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
