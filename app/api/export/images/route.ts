import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

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

    // Créer un array pour stocker tous les fichiers
    const fileBuffers: { name: string; buffer: Buffer }[] = []

    // Traiter chaque fichier
    for (const file of files) {
      try {
        console.log(`📁 Traitement du fichier: ${file.filename}`)

        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        // Lire le fichier
        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }

        const buffer = Buffer.concat(chunks)
        fileBuffers.push({
          name: file.filename || `image_${file._id}.jpg`,
          buffer: buffer,
        })

        console.log(`✅ Fichier traité: ${file.filename} (${buffer.length} bytes)`)
      } catch (fileError) {
        console.error(`❌ Erreur avec le fichier ${file.filename}:`, fileError)
      }
    }

    if (fileBuffers.length === 0) {
      return NextResponse.json({ error: "Aucune image n'a pu être traitée" }, { status: 500 })
    }

    // Créer un ZIP simple sans JSZip
    const archiver = require("archiver")
    const { Readable } = require("stream")

    // Créer un stream pour le ZIP
    const archive = archiver("zip", {
      zlib: { level: 6 },
    })

    const chunks: Buffer[] = []

    // Collecter les chunks du ZIP
    archive.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })

    // Ajouter tous les fichiers au ZIP
    fileBuffers.forEach(({ name, buffer }) => {
      archive.append(buffer, { name })
    })

    // Finaliser le ZIP
    archive.finalize()

    // Attendre que le ZIP soit terminé
    await new Promise<void>((resolve, reject) => {
      archive.on("end", () => resolve())
      archive.on("error", (err: Error) => reject(err))
    })

    const zipBuffer = Buffer.concat(chunks)

    console.log(`✅ ZIP généré: ${zipBuffer.length} bytes avec ${fileBuffers.length} images`)

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
