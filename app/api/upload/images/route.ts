import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { uploadToGridFS } from "@/lib/gridfs"

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

    // Traitement par batch de 50 fichiers pour éviter les timeouts
    const BATCH_SIZE = 50
    const totalBatches = Math.ceil(files.length / BATCH_SIZE)

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE
      const endIndex = Math.min(startIndex + BATCH_SIZE, files.length)
      const batch = files.slice(startIndex, endIndex)

      console.log(`📦 Traitement batch ${batchIndex + 1}/${totalBatches} (${batch.length} fichiers)`)

      // Traiter chaque fichier du batch
      for (const file of batch) {
        try {
          console.log(`📁 Upload: ${file.name} (${file.size} bytes)`)

          // Convertir le fichier en buffer
          const buffer = Buffer.from(await file.arrayBuffer())

          // Upload vers GridFS
          const fileId = await uploadToGridFS(buffer, file.name, {
            contentType: file.type,
            originalName: file.name,
            size: file.size,
            category: "luminaire",
          })

          results.uploaded++

          // Essayer d'associer l'image à un luminaire
          const filename = file.name
          const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")

          // Rechercher le luminaire correspondant
          const luminaire = await db.collection("luminaires").findOne({
            $or: [
              { filename: filename },
              { "Nom du fichier": filename },
              { nom: nameWithoutExt },
              { filename: nameWithoutExt },
              { "Nom du fichier": nameWithoutExt },
            ],
          })

          if (luminaire) {
            // Ajouter l'image au luminaire
            await db.collection("luminaires").updateOne(
              { _id: luminaire._id },
              {
                $push: {
                  images: {
                    id: fileId.toString(),
                    filename: filename,
                    url: `/api/images/${fileId}`,
                    contentType: file.type,
                    size: file.size,
                  },
                },
              },
            )
            results.associated++
            console.log(`✅ Image ${filename} associée au luminaire ${luminaire.nom}`)
          } else {
            console.log(`⚠️ Aucun luminaire trouvé pour l'image ${filename}`)
          }
        } catch (error: any) {
          console.error(`❌ Erreur upload ${file.name}:`, error)
          results.errors.push(`${file.name}: ${error.message}`)
        }
      }

      // Log de progression
      console.log(`📊 Batch ${batchIndex + 1} terminé: ${results.uploaded} uploadées, ${results.associated} associées`)

      // Petite pause entre les batches pour éviter la surcharge
      if (batchIndex < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(`✅ Upload terminé: ${results.uploaded} uploadées, ${results.associated} associées`)

    return NextResponse.json({
      success: true,
      message: `${results.uploaded} images uploadées, ${results.associated} associées`,
      uploaded: results.uploaded,
      associated: results.associated,
      errors: results.errors.slice(0, 10), // Limiter les erreurs affichées
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'upload d'images:", error)
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
