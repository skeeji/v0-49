import { type NextRequest, NextResponse } from "next/server"
import { uploadToGridFS } from "@/lib/gridfs"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/images - Début du traitement")

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 ${files.length} fichiers reçus`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    const uploadedFiles = []
    let associatedCount = 0

    for (const file of files) {
      console.log(`📁 Fichier à uploader: ${file.name} ${file.size} bytes`)

      // Convertir le fichier en buffer
      const buffer = Buffer.from(await file.arrayBuffer())

      // Upload vers GridFS
      const fileId = await uploadToGridFS(buffer, file.name, file.type)

      uploadedFiles.push({
        id: fileId.toString(),
        filename: file.name,
        size: file.size,
        contentType: file.type,
      })

      // Essayer d'associer l'image à un luminaire
      const baseFilename = file.name.replace(/\.[^/.]+$/, "") // Enlever l'extension

      const luminaire = await db.collection("luminaires").findOne({
        $or: [
          { filename: file.name },
          { "Nom du fichier": file.name },
          { filename: baseFilename },
          { "Nom du fichier": baseFilename },
        ],
      })

      if (luminaire) {
        await db.collection("luminaires").updateOne(
          { _id: luminaire._id },
          {
            $push: { images: fileId.toString() },
            $set: { updatedAt: new Date() },
          },
        )
        associatedCount++
        console.log(`🔗 Image ${file.name} associée au luminaire: ${luminaire.nom}`)
      } else {
        console.log(`⚠️ Aucun luminaire trouvé pour l'image: ${file.name}`)
      }
    }

    console.log(`📤 Envoi des fichiers vers /api/upload/images...`)
    console.log(`✅ Upload terminé:`)

    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} images uploadées, ${associatedCount} associées`,
      uploaded: uploadedFiles.length,
      associated: associatedCount,
      uploadedFiles: uploadedFiles,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'upload des images",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
