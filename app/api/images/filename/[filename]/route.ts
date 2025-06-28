import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = decodeURIComponent(params.filename)
    console.log(`🖼️ Recherche de l'image: ${filename}`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    // Rechercher le fichier par nom
    const files = await bucket.find({ filename: filename }).toArray()

    if (files.length === 0) {
      console.log(`❌ Image non trouvée: ${filename}`)

      // Retourner une image placeholder au lieu d'une erreur 404
      return new NextResponse(
        `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">
            Image non trouvée
          </text>
          <text x="50%" y="60%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="Arial, sans-serif" font-size="12">
            ${filename}
          </text>
        </svg>`,
        {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=3600",
          },
        },
      )
    }

    const file = files[0]
    console.log(`✅ Image trouvée: ${filename}, taille: ${file.length} bytes`)

    // Déterminer le type MIME
    let contentType = "image/jpeg" // Par défaut
    if (filename.toLowerCase().endsWith(".png")) {
      contentType = "image/png"
    } else if (filename.toLowerCase().endsWith(".gif")) {
      contentType = "image/gif"
    } else if (filename.toLowerCase().endsWith(".webp")) {
      contentType = "image/webp"
    } else if (filename.toLowerCase().endsWith(".svg")) {
      contentType = "image/svg+xml"
    }

    // Créer un stream pour lire le fichier
    const downloadStream = bucket.openDownloadStreamByName(filename)

    // Convertir le stream en buffer
    const chunks: Buffer[] = []

    return new Promise((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        console.log(`📤 Image servie: ${filename} (${buffer.length} bytes)`)

        resolve(
          new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000", // Cache 1 an
              "Content-Length": buffer.length.toString(),
            },
          }),
        )
      })

      downloadStream.on("error", (error) => {
        console.error(`❌ Erreur lecture image ${filename}:`, error)

        // Retourner une image placeholder en cas d'erreur
        const placeholderSvg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#fee2e2"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#dc2626" font-family="Arial, sans-serif" font-size="16">
            Erreur de chargement
          </text>
        </svg>`

        resolve(
          new NextResponse(placeholderSvg, {
            status: 200,
            headers: {
              "Content-Type": "image/svg+xml",
              "Cache-Control": "no-cache",
            },
          }),
        )
      })
    })
  } catch (error: any) {
    console.error(`❌ Erreur dans GET /api/images/filename/${params.filename}:`, error)

    // Retourner une image placeholder en cas d'erreur
    const errorSvg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#fef2f2"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#ef4444" font-family="Arial, sans-serif" font-size="16">
        Erreur serveur
      </text>
    </svg>`

    return new NextResponse(errorSvg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    })
  }
}
