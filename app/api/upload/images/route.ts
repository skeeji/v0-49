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

    console.log(`📁 ${files.length} images reçues`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    const results = {
      uploaded: 0,
      associated: 0,
      errors: [] as string[],
      uploadedFiles: [] as any[],
    }

    // Uploader chaque image
    for (const file of files) {
      try {
        console.log(`📁 Traitement: ${file.name} (${file.size} bytes)`)

        // Convertir en buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        // Upload vers GridFS
        const fileId = await uploadFile(buffer, file.name, {
          contentType: file.type,
          originalName: file.name,
          size: file.size,
        })

        results.uploaded++
        results.uploadedFiles.push({
          filename: file.name,
          fileId: fileId.toString(),
          size: file.size,
          contentType: file.type,
        })

        // Essayer d'associer à un luminaire
        const baseFilename = file.name.replace(/\.[^/.]+$/, "") // Sans extension
        const luminaire = await db.collection("luminaires").findOne({
          $or: [
            { filename: file.name },
            { filename: baseFilename },
            { "Nom du fichier": file.name },
            { "Nom du fichier": baseFilename },
          ],
        })

        if (luminaire) {
          // Ajouter l'image au luminaire
          await db.collection("luminaires").updateOne(
            { _id: luminaire._id },
            {
              $push: {
                images: {
                  fileId: fileId.toString(),
                  filename: file.name,
                  contentType: file.type,
                  size: file.size,
                },
              },
              $set: { updatedAt: new Date() },
            },
          )

          results.associated++
          console.log(`✅ Image associée au luminaire: ${luminaire.nom}`)
        } else {
          console.log(`⚠️ Aucun luminaire trouvé pour: ${file.name}`)
        }
      } catch (error: any) {
        console.error(`❌ Erreur upload ${file.name}:`, error)
        results.errors.push(`${file.name}: ${error.message}`)
      }
    }

    console.log(`✅ Upload terminé: ${results.uploaded} uploadées, ${results.associated} associées`)

    return NextResponse.json({
      success: true,
      message: `${results.uploaded} images uploadées, ${results.associated} associées`,
      uploaded: results.uploaded,
      associated: results.associated,
      uploadedFiles: results.uploadedFiles,
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
