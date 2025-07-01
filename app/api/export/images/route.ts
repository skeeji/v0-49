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
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    // Créer un stream pour l'archive ZIP
    const archive = archiver("zip", {
      zlib: { level: 9 },
    })

    // Créer un stream de réponse
    const chunks: Buffer[] = []

    archive.on("data", (chunk) => {
      chunks.push(chunk)
    })

    archive.on("error", (err) => {
      console.error("❌ Erreur lors de la création de l'archive:", err)
      throw err
    })

    // Récupérer tous les fichiers de GridFS
    const files = await bucket.find({}).toArray()
    console.log(`📁 ${files.length} fichiers trouvés dans GridFS`)

    // Ajouter chaque fichier à l'archive
    for (const file of files) {
      try {
        const downloadStream = bucket.openDownloadStream(file._id)

        // Convertir le stream en buffer
        const buffers: Buffer[] = []
        for await (const chunk of downloadStream) {
          buffers.push(chunk)
        }
        const fileBuffer = Buffer.concat(buffers)

        // Ajouter le fichier à l'archive avec son nom original
        archive.append(fileBuffer, { name: file.filename })
        console.log(`✅ Fichier ajouté: ${file.filename}`)
      } catch (error) {
        console.error(`❌ Erreur lors de l'ajout du fichier ${file.filename}:`, error)
      }
    }

    // Finaliser l'archive
    await archive.finalize()

    // Attendre que tous les chunks soient collectés
    await new Promise((resolve) => {
      archive.on("end", resolve)
    })

    // Créer la réponse avec le ZIP
    const zipBuffer = Buffer.concat(chunks)

    console.log(`✅ Archive créée: ${zipBuffer.length} bytes`)

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur lors de l'export des images:", error)
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
