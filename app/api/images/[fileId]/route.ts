import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const bucket = await getBucket()
    const fileId = new ObjectId(params.fileId)

    const downloadStream = bucket.openDownloadStream(fileId)

    // Gérer les erreurs de stream
    downloadStream.on("error", (error) => {
      console.error("Erreur lors du téléchargement du fichier:", error)
    })

    // Convertir le stream en Response
    const chunks: Buffer[] = []

    return new Promise<NextResponse>((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)

        // Déterminer le type de contenu
        const contentType = downloadStream.s?.file?.contentType || "application/octet-stream"

        resolve(
          new NextResponse(buffer, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000",
            },
          }),
        )
      })

      downloadStream.on("error", (error) => {
        console.error("Erreur stream:", error)
        reject(new NextResponse("Fichier non trouvé", { status: 404 }))
      })
    })
  } catch (error) {
    console.error("Erreur lors de la récupération du fichier:", error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}
