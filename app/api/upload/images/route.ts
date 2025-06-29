import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { uploadFile } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/images - Début du traitement")

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 ${files.length} fichiers reçus`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    const results = {
      uploaded: 0,
      associated: 0,
      errors: [] as string[],
    }

    // Uploader chaque fichier
    for (const file of files) {
      try {
        console.log(`📁 Traitement: ${file.name} (${file.size} bytes)`)

        // Convertir en Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Uploader vers GridFS
        const fileId = await uploadFile(buffer, file.name, {
          contentType: file.type,
          originalName: file.name,
          size: file.size,
        })

        results.uploaded++

        // Essayer d'associer l'image à un luminaire
        const baseFilename = file.name.replace(/\.[^/.]+$/, "")

        // Rechercher le luminaire correspondant
        const luminaire = await db.collection("luminaires").findOne({
          $or: [
            { filename: file.name },
            { filename: baseFilename },
            { "Nom du fichier": file.name },
            { "Nom du fichier": baseFilename },
            { nom: baseFilename },
          ],
        })

        if (luminaire) {
          // Ajouter l'ID de l'image au luminaire
          await db.collection("luminaires").updateOne(
            { _id: luminaire._id },
            {
              $push: { images: fileId },
              $set: { updatedAt: new Date() },
            },
          )

          results.associated++
          console.log(`✅ Image ${file.name} associée au luminaire: ${luminaire.nom}`)
        } else {
          console.log(`⚠️ Aucun luminaire trouvé pour l'image: ${file.name}`)
        }
      } catch (error: any) {
        console.error(`❌ Erreur upload ${file.name}:`, error)
        results.errors.push(`${file.name}: ${error.message}`)
      }
    }

    console.log(`✅ Upload terminé: ${results.uploaded} uploadés, ${results.associated} associés`)

    return NextResponse.json({
      success: true,
      message: `${results.uploaded} images uploadées, ${results.associated} associées`,
      uploaded: results.uploaded,
      associated: results.associated,
      errors: results.errors,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
