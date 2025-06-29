import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = decodeURIComponent(params.filename)
    console.log(`🖼️ Recherche image: ${filename}`)

    const bucket = await getBucket()

    // Chercher le fichier par nom exact
    const files = await bucket.find({ filename }).toArray()

    if (files.length === 0) {
      console.log(`❌ Image non trouvée: ${filename}`)
      // Retourner une image placeholder au lieu d'une erreur 404
      return NextResponse.redirect("/placeholder.svg?height=300&width=300")
    }

    const file = files[0]
    console.log(`✅ Image trouvée: ${filename}, taille: ${file.length} bytes`)

    // Créer un stream de téléchargement
    const downloadStream = bucket.openDownloadStream(file._id)

    // Convertir le stream en buffer avec timeout
    const chunks: Buffer[] = []

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new NextResponse("Timeout lecture image", { status: 408 }))
      }, 10000)

      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        clearTimeout(timeout)
        const buffer = Buffer.concat(chunks)

        const response = new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": file.contentType || "image/jpeg",
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        })

        resolve(response)
      })

      downloadStream.on("error", (error) => {
        clearTimeout(timeout)
        console.error(`❌ Erreur lecture image ${filename}:`, error)
        reject(new NextResponse("Erreur lecture image", { status: 500 }))
      })
    })
  } catch (error: any) {
    console.error(`❌ Erreur API image ${params.filename}:`, error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}
