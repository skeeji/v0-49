import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"
import archiver from "archiver"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📦 API /api/export/images - Export de toutes les images")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    // Créer un stream pour l'archive ZIP
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Compression maximale
    })

    // Headers pour le téléchargement
    const headers = new Headers()
    headers.set("Content-Type", "application/zip")
    headers.set(
      "Content-Disposition",
      `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
    )

    // Stream de réponse
    const { readable, writable } = new TransformStream()
    archive.pipe(writable)

    // Récupérer tous les fichiers de GridFS
    const files = await bucket.find({}).toArray()
    console.log(`📊 ${files.length} fichiers trouvés dans GridFS`)

    let addedFiles = 0

    // Ajouter chaque fichier à l'archive
    for (const file of files) {
      try {
        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        // Lire le fichier en chunks
        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }

        const buffer = Buffer.concat(chunks)
        archive.append(buffer, { name: file.filename })
        addedFiles++
        console.log(`✅ Ajouté: ${file.filename}`)
      } catch (error) {
        console.error(`❌ Erreur pour ${file.filename}:`, error)
      }
    }

    console.log(`📦 ${addedFiles} fichiers ajoutés à l'archive`)

    // Finaliser l'archive
    archive.finalize()

    return new Response(readable, { headers })
  } catch (error: any) {
    console.error("❌ Erreur export images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export des images",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
