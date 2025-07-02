import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"
import JSZip from "jszip"

export async function GET(request: NextRequest) {
  try {
    console.log("📦 Export de toutes les images...")

    const { db } = await connectToDatabase()
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    // Récupérer tous les fichiers images
    const files = await bucket.find({}).toArray()
    console.log(`📊 ${files.length} images trouvées dans GridFS`)

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune image trouvée" }, { status: 404 })
    }

    // Créer un ZIP
    const zip = new JSZip()
    let processedCount = 0

    // Ajouter chaque image au ZIP
    for (const file of files) {
      try {
        console.log(`📁 Traitement ${file.filename} (${processedCount + 1}/${files.length})`)

        // Créer un stream pour lire le fichier depuis GridFS
        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        // Lire le fichier en chunks
        await new Promise<void>((resolve, reject) => {
          downloadStream.on("data", (chunk: Buffer) => {
            chunks.push(chunk)
          })

          downloadStream.on("end", () => {
            resolve()
          })

          downloadStream.on("error", (error: Error) => {
            console.error(`❌ Erreur lecture ${file.filename}:`, error)
            reject(error)
          })
        })

        const buffer = Buffer.concat(chunks)

        // Nettoyer le nom de fichier pour éviter les problèmes
        const safeFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, "_")

        // Ajouter au ZIP
        zip.file(safeFilename, buffer)
        processedCount++

        console.log(`✅ ${file.filename} ajouté (${buffer.length} bytes)`)
      } catch (error) {
        console.error(`❌ Erreur avec ${file.filename}:`, error)
        // Continuer avec les autres fichiers
      }
    }

    console.log(`🗜️ Génération du ZIP avec ${processedCount} images...`)

    // Générer le ZIP
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    })

    console.log(`✅ ZIP généré: ${zipBuffer.length} bytes`)

    // Retourner le ZIP avec les bons headers
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-cache",
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
