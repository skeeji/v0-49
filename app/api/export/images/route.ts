import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"
import archiver from "archiver"
import { Readable } from "stream"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📦 API /api/export/images - Export de toutes les images")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Récupérer tous les fichiers de GridFS
    const files = await db.collection("uploads.files").find({}).toArray()

    console.log(`📊 ${files.length} fichiers trouvés dans GridFS`)

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune image à exporter" }, { status: 404 })
    }

    // Créer un stream pour l'archive ZIP
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Compression maximale
    })

    // Créer un ReadableStream pour la réponse
    const { readable, writable } = new TransformStream()

    // Pipe l'archive vers le writable stream
    Readable.from(archive).pipe(Readable.toWeb(writable) as any)

    // Gérer les erreurs
    archive.on("error", (err) => {
      console.error("❌ Erreur lors de la création de l'archive:", err)
      throw err
    })

    // Ajouter chaque fichier à l'archive
    let addedCount = 0
    for (const file of files) {
      try {
        const downloadStream = bucket.openDownloadStream(file._id)

        // Convertir le stream en buffer avec limite de temps
        const chunks: Buffer[] = []
        const timeout = setTimeout(() => {
          downloadStream.destroy()
        }, 10000) // 10 secondes max par fichier

        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }
        clearTimeout(timeout)

        const buffer = Buffer.concat(chunks)

        // Ajouter à l'archive
        archive.append(buffer, { name: file.filename })
        addedCount++

        console.log(`✅ Ajouté à l'archive: ${file.filename} (${Math.round(buffer.length / 1024)}KB)`)
      } catch (error: any) {
        console.error(`❌ Erreur lors de l'ajout de ${file.filename}:`, error.message)
        // Continuer avec les autres fichiers
      }
    }

    // Finaliser l'archive
    await archive.finalize()

    console.log(`✅ Archive créée avec ${addedCount} fichiers`)

    // Retourner le stream
    return new NextResponse(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/export/images:", error)
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
