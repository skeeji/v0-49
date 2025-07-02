import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"
import JSZip from "jszip"

export async function GET(request: NextRequest) {
  try {
    console.log("📦 Début export des images...")

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

    // Ajouter chaque image au ZIP
    for (const file of files) {
      try {
        console.log(`📁 Ajout de ${file.filename} au ZIP...`)

        // Lire le fichier depuis GridFS
        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        await new Promise((resolve, reject) => {
          downloadStream.on("data", (chunk) => {
            chunks.push(chunk)
          })

          downloadStream.on("end", () => {
            resolve(null)
          })

          downloadStream.on("error", (error) => {
            console.error(`❌ Erreur lecture ${file.filename}:`, error)
            reject(error)
          })
        })

        const buffer = Buffer.concat(chunks)

        // Ajouter au ZIP avec un nom de fichier sécurisé
        const safeFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, "_")
        zip.file(safeFilename, buffer)

        console.log(`✅ ${file.filename} ajouté au ZIP (${buffer.length} bytes)`)
      } catch (error) {
        console.error(`❌ Erreur traitement ${file.filename}:`, error)
        // Continuer avec les autres fichiers
      }
    }

    console.log("🗜️ Génération du ZIP...")

    // Générer le ZIP
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
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur export images:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
