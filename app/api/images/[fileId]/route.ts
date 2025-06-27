import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    console.log("🖼️ API /api/images/[fileId] GET - FileId:", params.fileId)

    const bucket = await getBucket()

    if (!ObjectId.isValid(params.fileId)) {
      return NextResponse.json({ error: "ID de fichier invalide" }, { status: 400 })
    }

    const fileId = new ObjectId(params.fileId)

    // Vérifier si le fichier existe
    const files = await bucket.find({ _id: fileId }).toArray()
    if (files.length === 0) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 })
    }

    const file = files[0]
    const downloadStream = bucket.openDownloadStream(fileId)

    // Convertir le stream en buffer
    const chunks: Buffer[] = []

    return new Promise<NextResponse>((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        const contentType = file.contentType || "image/jpeg"

        console.log("✅ Image servie:", params.fileId)

        resolve(
          new NextResponse(buffer, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          }),
        )
      })

      downloadStream.on("error", (error) => {
        console.error("❌ Erreur stream:", error)
        reject(new NextResponse("Erreur lors de la lecture du fichier", { status: 500 }))
      })
    })
  } catch (error) {
    console.error("❌ Erreur API /api/images/[fileId]:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
