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

    // CORRECTION: Traiter par petits batches pour éviter les timeouts
    const BATCH_SIZE = 10 // Réduire drastiquement pour éviter les erreurs de connexion
    let totalUploaded = 0
    let totalAssociated = 0

    for (let batchIndex = 0; batchIndex < files.length; batchIndex += BATCH_SIZE) {
      const batch = files.slice(batchIndex, batchIndex + BATCH_SIZE)
      console.log(
        `📦 Batch ${Math.floor(batchIndex / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)}: ${batch.length} fichiers`,
      )

      // 1. Upload des fichiers vers GridFS
      for (const file of batch) {
        try {
          console.log(`📤 Upload de ${file.name}...`)

          const stream = fileToStream(file)
          const uploadStream = bucket.openUploadStream(file.name, {
            contentType: file.type,
          })

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout upload"))
            }, 30000) // 30 secondes timeout

            stream
              .pipe(uploadStream)
              .on("error", (err) => {
                clearTimeout(timeout)
                reject(err)
              })
              .on("finish", () => {
                clearTimeout(timeout)
                resolve()
              })
          })

          const fileId = uploadStream.id.toString()

          uploadedFiles.push({
            name: file.name,
            id: fileId,
            path: `/api/images/${fileId}`,
            size: file.size,
          })

          totalUploaded++
          console.log(`✅ ${file.name} uploadé avec l'ID: ${fileId}`)
        } catch (error: any) {
          errors.push(`${file.name}: ${error.message}`)
          console.error(`❌ Erreur upload ${file.name}:`, error)
        }
      }

      // 2. Association avec les luminaires pour ce batch
      const client = await clientPromise
      const db = client.db(DBNAME)

      for (const uploadedFile of uploadedFiles.slice(-batch.length)) {
        try {
          console.log(`🔗 Recherche luminaire pour: ${uploadedFile.name}`)

          // Chercher le luminaire correspondant
          const luminaire = await db.collection("luminaires").findOne({
            $or: [{ "Nom du fichier": uploadedFile.name }, { filename: uploadedFile.name }],
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

            totalAssociated++
            console.log(
              `✅ Image ${uploadedFile.name} associée au luminaire: ${luminaire["Nom luminaire"] || luminaire.nom || "Sans nom"}`,
            )
          } else {
            console.warn(`⚠️ Aucun luminaire trouvé pour: ${uploadedFile.name}`)
          }
        } catch (error: any) {
          console.error(`❌ Erreur association ${uploadedFile.name}:`, error)
        }
      }

      // Log de progression
      console.log(`📊 Progression: ${totalUploaded}/${files.length} images uploadées, ${totalAssociated} associées`)

      // Petite pause entre les batches
      if (batchIndex + BATCH_SIZE < files.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`✅ Upload terminé: ${totalUploaded} images, ${totalAssociated} associations`)

    return NextResponse.json({
      success: true,
      message: `${totalUploaded} images uploadées, ${totalAssociated} associées`,
      uploaded: totalUploaded,
      associated: totalAssociated,
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
