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

    // Utiliser node-stream-zip pour créer le ZIP
    const { Readable } = require("stream")

    // Créer un stream de réponse
    const encoder = new TextEncoder()

    // En-têtes ZIP basiques
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]) // Signature ZIP

    // Créer une réponse streaming simple
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Collecter tous les fichiers
          const fileBuffers: Array<{ name: string; data: Buffer }> = []

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

              fileBuffers.push({
                name: safeFilename,
                data: buffer,
              })

              console.log(`✅ Fichier traité: ${safeFilename} (${buffer.length} bytes)`)
            } catch (fileError) {
              console.error(`❌ Erreur avec le fichier ${file.filename}:`, fileError)
            }
          }

          if (fileBuffers.length === 0) {
            controller.error(new Error("Aucune image n'a pu être traitée"))
            return
          }

          // Créer un ZIP simple avec yazl
          const yazl = require("yazl")
          const zipFile = new yazl.ZipFile()

          // Ajouter tous les fichiers
          fileBuffers.forEach(({ name, data }) => {
            zipFile.addBuffer(data, name)
          })

          zipFile.end()

          // Lire le ZIP et l'envoyer
          zipFile.outputStream.on("data", (chunk: Buffer) => {
            controller.enqueue(chunk)
          })

          zipFile.outputStream.on("end", () => {
            console.log(`✅ ZIP généré avec ${fileBuffers.length} images`)
            controller.close()
          })

          zipFile.outputStream.on("error", (error: Error) => {
            console.error("❌ Erreur ZIP:", error)
            controller.error(error)
          })
        } catch (error) {
          console.error("❌ Erreur lors de l'export:", error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
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
