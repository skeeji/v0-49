import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = decodeURIComponent(params.filename)
    console.log(`🖼️ Recherche image: ${filename}`)

    const bucket = await getBucket()

    // Chercher le fichier par nom
    const files = await bucket.find({ filename }).toArray()

    if (files.length === 0) {
      console.log(`❌ Image non trouvée: ${filename}`)
      return new NextResponse("Image non trouvée", { status: 404 })
    }

    const file = files[0]
    console.log(`✅ Image trouvée: ${filename}, ID: ${file._id}`)

    // Créer un stream de téléchargement
    const downloadStream = bucket.openDownloadStream(file._id)

    // Convertir le stream en buffer
    const chunks: Buffer[] = []

    return new Promise((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)

        const response = new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": file.contentType || "image/jpeg",
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=31536000",
          },
        })

        resolve(response)
      })

      downloadStream.on("error", (error) => {
        console.error(`❌ Erreur lecture image ${filename}:`, error)
        reject(new NextResponse("Erreur lecture image", { status: 500 }))
      })
    })
  } catch (error: any) {
    console.error(`❌ Erreur API image ${params.filename}:`, error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}
