import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"
import archiver from "archiver"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("📦 Début de l'export des images...")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "fs" })

    // Récupérer tous les fichiers images de GridFS
    const files = await db.collection("fs.files").find({}).toArray()

    console.log(`📊 ${files.length} fichiers trouvés dans GridFS`)

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune image trouvée" }, { status: 404 })
    }

    // Créer l'archive ZIP
    const archive = archiver("zip", {
      zlib: { level: 9 },
    })

    // Créer un stream pour la réponse
    const stream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk) => {
          controller.enqueue(chunk)
        })

        archive.on("end", () => {
          console.log("✅ Archive ZIP créée avec succès")
          controller.close()
        })

        archive.on("error", (err) => {
          console.error("❌ Erreur création archive:", err)
          controller.error(err)
        })

        // Ajouter chaque image à l'archive
        let processed = 0
        const addNextFile = async () => {
          if (processed >= files.length) {
            await archive.finalize()
            return
          }

          const file = files[processed]
          processed++

          try {
            console.log(`📁 Ajout ${processed}/${files.length}: ${file.filename}`)

            const downloadStream = bucket.openDownloadStream(file._id)
            const chunks: Buffer[] = []

            downloadStream.on("data", (chunk) => {
              chunks.push(chunk)
            })

            downloadStream.on("end", async () => {
              const buffer = Buffer.concat(chunks)
              archive.append(buffer, { name: file.filename })
              await addNextFile()
            })

            downloadStream.on("error", async (err) => {
              console.error(`❌ Erreur lecture ${file.filename}:`, err)
              await addNextFile()
            })
          } catch (error) {
            console.error(`❌ Erreur traitement ${file.filename}:`, error)
            await addNextFile()
          }
        }

        addNextFile()
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
      },
    })
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
