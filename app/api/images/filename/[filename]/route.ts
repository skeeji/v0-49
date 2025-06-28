import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    console.log("🖼️ API /api/images/filename/[filename] GET - Filename:", params.filename)

    const bucket = await getBucket()

    // Chercher le fichier par nom de fichier avec plusieurs variantes
    const searchVariants = [
      params.filename,
      params.filename.toLowerCase(),
      params.filename.toUpperCase(),
      params.filename.replace(/\.[^/.]+$/, ""), // Sans extension
    ]

    let file = null
    let files = []

    for (const variant of searchVariants) {
      files = await bucket.find({ filename: variant }).toArray()
      if (files.length > 0) {
        file = files[0]
        console.log("✅ Fichier trouvé avec variante:", variant)
        break
      }
    }

    // Si pas trouvé par filename, chercher par _id si c'est un ObjectId
    if (!file && params.filename.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const { ObjectId } = require("mongodb")
        files = await bucket.find({ _id: new ObjectId(params.filename) }).toArray()
        if (files.length > 0) {
          file = files[0]
          console.log("✅ Fichier trouvé par ObjectId:", params.filename)
        }
      } catch (err) {
        console.log("❌ Erreur recherche par ObjectId:", err)
      }
    }

    if (!file) {
      console.log("❌ Fichier non trouvé:", params.filename)
      console.log("📋 Fichiers disponibles dans GridFS:")

      // Lister quelques fichiers pour debug
      const allFiles = await bucket.find({}).limit(10).toArray()
      allFiles.forEach((f) => {
        console.log(`  - ${f.filename} (${f._id})`)
      })

      // Retourner une image placeholder au lieu d'une erreur 404
      return new Response(
        `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280" font-family="Arial, sans-serif" font-size="16">
            Image non trouvée
          </text>
          <text x="50%" y="65%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="Arial, sans-serif" font-size="12">
            ${params.filename}
          </text>
        </svg>`,
        {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=3600",
          },
        },
      )
    }

    const downloadStream = bucket.openDownloadStream(file._id)

    // Convertir le stream en buffer
    const chunks: Buffer[] = []

    return new Promise<NextResponse>((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        const contentType = file.contentType || "image/jpeg"

        console.log("✅ Image servie:", params.filename, `(${buffer.length} bytes)`)

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

    // Retourner une image d'erreur au lieu d'une erreur 500
    return new Response(
      `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fef2f2"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#dc2626" font-family="Arial, sans-serif" font-size="16">
          Erreur de chargement
        </text>
      </svg>`,
      {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=60",
        },
      },
    )
  }
}
