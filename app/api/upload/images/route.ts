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

    // Traiter chaque image
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        console.log(`📁 Traitement image ${i + 1}/${files.length}: ${file.name}`)

        // Convertir le fichier en buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload vers GridFS
        const fileId = await uploadFile(buffer, file.name, {
          contentType: file.type,
          size: file.size,
          category: "luminaire",
        })

        results.uploaded++
        results.uploadedFiles.push({
          filename: file.name,
          fileId: fileId.toString(),
          size: file.size,
          contentType: file.type,
        })

        // Essayer d'associer l'image à un luminaire
        const baseFilename = file.name.replace(/\.[^/.]+$/, "")

        // Chercher un luminaire avec ce nom de fichier
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
          // Ajouter l'image au luminaire
          await db.collection("luminaires").updateOne(
            { _id: luminaire._id },
            {
              $push: {
                images: {
                  fileId: fileId.toString(),
                  filename: file.name,
                  url: `/api/images/${fileId}`,
                  contentType: file.type,
                  size: file.size,
                },
              },
            },
          )

          results.associated++
          console.log(`🔗 Image ${file.name} associée au luminaire: ${luminaire.nom}`)
        } else {
          console.log(`⚠️ Aucun luminaire trouvé pour l'image: ${file.name}`)
        }

        // Log de progression tous les 50 fichiers
        if (results.uploaded % 50 === 0) {
          console.log(
            `📊 Progression images: ${results.uploaded}/${files.length} uploadées, ${results.associated} associées`,
          )
        }
      } catch (error: any) {
        console.error(`❌ Erreur traitement image ${file.name}:`, error)
        results.errors.push(`${file.name}: ${error.message}`)
      }
    }

    console.log(`✅ Upload images terminé: ${results.uploaded} uploadées, ${results.associated} associées`)

    return NextResponse.json({
      success: true,
      message: `${results.uploaded} images uploadées, ${results.associated} associées`,
      uploaded: results.uploaded,
      associated: results.associated,
      uploadedFiles: results.uploadedFiles,
      errors: results.errors.slice(0, 10),
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload des images",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
