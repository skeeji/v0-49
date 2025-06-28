import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    console.log("🖼️ API /api/images/filename/[filename] GET - Filename:", params.filename)

    const bucket = await getBucket()

    // Chercher le fichier par nom de fichier
    const files = await bucket.find({ filename: params.filename }).toArray()

    if (files.length === 0) {
      console.log("❌ Fichier non trouvé:", params.filename)
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 })
    }

    const file = files[0]
    const downloadStream = bucket.openDownloadStreamByName(params.filename)

    // Convertir le stream en buffer
    const chunks: Buffer[] = []

    return new Promise<NextResponse>((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        const contentType = file.contentType || "image/jpeg"

        console.log("✅ Image servie par nom:", params.filename)

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
    console.error("❌ Erreur API /api/images/filename/[filename]:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
