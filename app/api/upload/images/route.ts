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

    // CORRECTION: Traiter par batches de 50 avec gestion d'erreurs améliorée
    const BATCH_SIZE = 50
    const filesToProcess = files.slice(0, BATCH_SIZE)

    console.log(`📦 Traitement de ${filesToProcess.length} images (batch limité)`)

    const uploadedFiles = []
    const errors = []
    let totalAssociated = 0

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Traiter chaque fichier individuellement avec retry
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i]
      let retryCount = 0
      const maxRetries = 2

      while (retryCount <= maxRetries) {
        try {
          console.log(`📤 Upload ${i + 1}/${filesToProcess.length}: ${file.name} (tentative ${retryCount + 1})`)

          // 1. Upload vers GridFS avec timeout réduit
          const stream = fileToStream(file)
          const uploadStream = bucket.openUploadStream(file.name, {
            contentType: file.type,
          })

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout upload (15s)"))
            }, 15000) // Timeout réduit à 15 secondes

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

          // 2. Association immédiate avec le luminaire
          try {
            const luminaire = await db.collection("luminaires").findOne({
              $or: [{ "Nom du fichier": file.name }, { filename: file.name }],
            })

            if (luminaire) {
              await db.collection("luminaires").updateOne(
                { _id: luminaire._id },
                {
                  $set: {
                    imageId: fileId,
                    imagePath: `/api/images/filename/${file.name}`,
                    updatedAt: new Date(),
                  },
                },
              )

              totalAssociated++
              console.log(`✅ ${file.name} → ${luminaire["Nom luminaire"] || "Sans nom"}`)
            }
          } catch (associationError: any) {
            console.warn(`⚠️ Erreur association ${file.name}:`, associationError.message)
          }

          // Succès, sortir de la boucle de retry
          break
        } catch (error: any) {
          retryCount++
          console.error(`❌ Erreur upload ${file.name} (tentative ${retryCount}):`, error.message)

          if (retryCount > maxRetries) {
            errors.push(`${file.name}: ${error.message} (après ${maxRetries} tentatives)`)
          } else {
            // Attendre avant de réessayer
            await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
          }
        }
      }

      // Petite pause entre chaque fichier
      if (i < filesToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    const remainingFiles = files.length - filesToProcess.length
    const successRate = Math.round((uploadedFiles.length / filesToProcess.length) * 100)

    console.log(
      `✅ Batch terminé: ${uploadedFiles.length}/${filesToProcess.length} images uploadées (${successRate}%), ${totalAssociated} associées`,
    )

    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} images uploadées, ${totalAssociated} associées${remainingFiles > 0 ? ` (${remainingFiles} restantes)` : ""}`,
      uploaded: uploadedFiles.length,
      associated: totalAssociated,
      remaining: remainingFiles,
      successRate,
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
