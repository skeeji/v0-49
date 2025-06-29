import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"
import { Readable } from "stream"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

function fileToStream(file: File) {
  const reader = file.stream().getReader()
  return new Readable({
    async read() {
      const { done, value } = await reader.read()
      this.push(done ? null : Buffer.from(value))
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const bucket = await getBucket()
    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`🖼️ ${files.length} images reçues pour upload`)

    const uploadedFiles = []
    const errors = []

    // 1. Upload des fichiers vers GridFS
    for (const file of files) {
      try {
        console.log(`📤 Upload de ${file.name}...`)

        const stream = fileToStream(file)
        const uploadStream = bucket.openUploadStream(file.name, {
          contentType: file.type,
        })

        await new Promise<void>((resolve, reject) => {
          stream
            .pipe(uploadStream)
            .on("error", reject)
            .on("finish", () => resolve())
        })

        const fileId = uploadStream.id.toString()
        uploadedFiles.push({
          name: file.name,
          id: fileId,
          path: `/api/images/${fileId}`,
          size: file.size,
        })

        console.log(`✅ ${file.name} uploadé avec l'ID: ${fileId}`)
      } catch (error: any) {
        errors.push(`${file.name}: ${error.message}`)
        console.error(`❌ Erreur upload ${file.name}:`, error)
      }
    }

    // 2. Association avec les luminaires
    const client = await clientPromise
    const db = client.db(DBNAME)

    let associatedCount = 0

    for (const uploadedFile of uploadedFiles) {
      try {
        const fileNameWithoutExt = uploadedFile.name.replace(/\.[^/.]+$/, "")
        console.log(`🔗 Recherche luminaire pour: ${fileNameWithoutExt}`)

        // Chercher le luminaire correspondant
        const luminaire = await db.collection("luminaires").findOne({
          $or: [
            { filename: uploadedFile.name },
            { filename: fileNameWithoutExt },
            { nom: { $regex: fileNameWithoutExt, $options: "i" } },
          ],
        })

        if (luminaire) {
          // Ajouter l'ID de l'image au luminaire
          const updatedImages = [...(luminaire.images || []), uploadedFile.id]

          await db.collection("luminaires").updateOne(
            { _id: luminaire._id },
            {
              $set: {
                images: updatedImages,
                updatedAt: new Date(),
              },
            },
          )

          associatedCount++
          console.log(`✅ Image ${uploadedFile.name} associée au luminaire: ${luminaire.nom}`)
        } else {
          console.warn(`⚠️ Aucun luminaire trouvé pour: ${uploadedFile.name}`)
        }
      } catch (error: any) {
        console.error(`❌ Erreur association ${uploadedFile.name}:`, error)
      }
    }

    console.log(`✅ Upload terminé: ${uploadedFiles.length} images, ${associatedCount} associations`)

    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} images uploadées, ${associatedCount} associées`,
      uploaded: uploadedFiles.length,
      associated: associatedCount,
      uploadedFiles,
      errors,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur upload",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
