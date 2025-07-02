import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"
import JSZip from "jszip"

export async function GET(request: NextRequest) {
  try {
    console.log("📦 Début de l'export des images...")

    const { db } = await connectToDatabase()
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    // Récupérer tous les fichiers
    const files = await bucket.find({}).toArray()
    console.log(`📊 ${files.length} fichiers trouvés dans GridFS`)

    if (files.length === 0) {
      return NextResponse.json({ error: "Aucune image trouvée" }, { status: 404 })
    }

    // Créer un ZIP
    const zip = new JSZip()

    // Ajouter chaque fichier au ZIP
    for (const file of files) {
      try {
        console.log(`📁 Traitement du fichier: ${file.filename}`)

        // Créer un stream pour lire le fichier depuis GridFS
        const downloadStream = bucket.openDownloadStream(file._id)

        // Convertir le stream en buffer
        const chunks: Buffer[] = []

        await new Promise((resolve, reject) => {
          downloadStream.on("data", (chunk) => {
            chunks.push(chunk)
          })

          downloadStream.on("end", () => {
            resolve(null)
          })

          downloadStream.on("error", (error) => {
            reject(error)
          })
        })

        const buffer = Buffer.concat(chunks)

        // Ajouter le fichier au ZIP avec un nom sécurisé
        const safeFilename = file.filename || `image_${file._id}.jpg`
        zip.file(safeFilename, buffer)
        console.log(`✅ Fichier ajouté au ZIP: ${safeFilename} (${buffer.length} bytes)`)
      } catch (fileError) {
        console.error(`❌ Erreur avec le fichier ${file.filename}:`, fileError)
        // Continuer avec les autres fichiers même si un échoue
      }
    }

    // Générer le ZIP
    console.log("🗜️ Génération du fichier ZIP...")
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    })
    console.log(`✅ ZIP généré: ${zipBuffer.length} bytes`)

    // Retourner le ZIP
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("❌ Erreur lors de l'export des images:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de l'export des images",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}
