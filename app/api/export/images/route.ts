import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export async function GET() {
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

    // Créer un simple ZIP avec les données
    const fileData: Array<{ name: string; data: Buffer }> = []

    // Traiter chaque fichier
    for (const file of files) {
      try {
        console.log(`📁 Traitement du fichier: ${file.filename}`)

        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }

        const buffer = Buffer.concat(chunks)
        const safeFilename = file.filename || `image_${file._id}.jpg`

        fileData.push({
          name: safeFilename,
          data: buffer,
        })

        console.log(`✅ Fichier traité: ${safeFilename} (${buffer.length} bytes)`)
      } catch (fileError) {
        console.error(`❌ Erreur avec le fichier ${file.filename}:`, fileError)
      }
    }

    if (fileData.length === 0) {
      return NextResponse.json({ error: "Aucune image n'a pu être traitée" }, { status: 500 })
    }

    // Créer un ZIP simple
    const AdmZip = require("adm-zip")
    const zip = new AdmZip()

    // Ajouter chaque fichier au ZIP
    fileData.forEach(({ name, data }) => {
      zip.addFile(name, data)
    })

    // Générer le buffer du ZIP
    const zipBuffer = zip.toBuffer()

    console.log(`✅ ZIP généré: ${zipBuffer.length} bytes avec ${fileData.length} images`)

    // Retourner le ZIP
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
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
