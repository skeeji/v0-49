import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API /api/upload/images - Début de l'upload images")

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier image fourni" }, { status: 400 })
    }

    console.log(`📁 ${files.length} fichiers images reçus`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    const results = {
      uploaded: 0,
      associated: 0,
      errors: [] as string[],
    }

    // Traiter par batch de 10 pour éviter les timeouts
    const BATCH_SIZE = 10
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE)
      console.log(`📦 Traitement batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)}`)

      for (const file of batch) {
        try {
          // Vérifier le type de fichier
          if (!file.type.startsWith("image/")) {
            results.errors.push(`${file.name}: Type de fichier invalide`)
            continue
          }

          // Convertir en buffer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Upload vers GridFS
          const uploadStream = bucket.openUploadStream(file.name, {
            metadata: {
              contentType: file.type,
              uploadDate: new Date(),
              type: "image",
              originalName: file.name,
            },
          })

          await new Promise((resolve, reject) => {
            uploadStream.on("error", reject)
            uploadStream.on("finish", resolve)
            uploadStream.end(buffer)
          })

          results.uploaded++

          // Essayer d'associer l'image à un luminaire
          const luminaireCollection = db.collection("luminaires")
          const baseFilename = file.name.replace(/\.[^/.]+$/, "")

          const luminaire = await luminaireCollection.findOne({
            $or: [
              { "Nom du fichier": file.name },
              { "Nom du fichier": baseFilename },
              { filename: file.name },
              { filename: baseFilename },
            ],
          })

          if (luminaire) {
            await luminaireCollection.updateOne(
              { _id: luminaire._id },
              {
                $addToSet: { images: file.name },
                $set: { updatedAt: new Date() },
              },
            )
            results.associated++
            console.log(`🔗 Image associée: ${file.name} -> ${luminaire.nom}`)
          }

          console.log(`✅ Image uploadée: ${file.name}`)
        } catch (error: any) {
          console.error(`❌ Erreur upload ${file.name}:`, error)
          results.errors.push(`${file.name}: ${error.message}`)
        }
      }

      // Petite pause entre les batches
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`✅ Upload terminé: ${results.uploaded} images uploadées, ${results.associated} associées`)

    return NextResponse.json({
      success: true,
      message: `${results.uploaded} images uploadées, ${results.associated} associées`,
      uploaded: results.uploaded,
      associated: results.associated,
      errors: results.errors.slice(0, 10),
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload images:", error)
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
