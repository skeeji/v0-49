import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API /api/upload/images - Début de l'upload")

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 ${files.length} fichiers reçus pour upload`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    let uploaded = 0
    let associated = 0
    const errors: string[] = []

    // Traitement par batch de 50 fichiers
    const BATCH_SIZE = 50
    const batches = []
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE))
    }

    console.log(`📦 Traitement en ${batches.length} batches de ${BATCH_SIZE} fichiers`)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`📦 Batch ${batchIndex + 1}/${batches.length}: ${batch.length} fichiers`)

      for (const file of batch) {
        try {
          // Vérifier si le fichier existe déjà
          const existingFile = await bucket.find({ filename: file.name }).toArray()
          if (existingFile.length > 0) {
            console.log(`⚠️ Fichier déjà existant: ${file.name}`)
            associated++
            continue
          }

          // Upload du fichier
          const uploadStream = bucket.openUploadStream(file.name, {
            metadata: {
              type: "luminaire-image",
              originalName: file.name,
              uploadDate: new Date(),
            },
          })

          const buffer = await file.arrayBuffer()
          const uint8Array = new Uint8Array(buffer)

          await new Promise<void>((resolve, reject) => {
            uploadStream.end(uint8Array, (error) => {
              if (error) {
                reject(error)
              } else {
                resolve()
              }
            })
          })

          uploaded++

          // Associer l'image au luminaire correspondant
          try {
            const luminaireResult = await db.collection("luminaires").updateOne(
              { "Nom du fichier": file.name },
              {
                $set: {
                  imageUploaded: true,
                  imageId: uploadStream.id,
                  updatedAt: new Date(),
                },
              },
            )

            if (luminaireResult.matchedCount > 0) {
              associated++
            }
          } catch (associationError) {
            console.log(`⚠️ Impossible d'associer ${file.name} à un luminaire`)
          }
        } catch (error: any) {
          const errorMsg = `Erreur upload ${file.name}: ${error.message}`
          errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      // Pause entre les batches pour éviter la surcharge
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`✅ Upload terminé: ${uploaded} uploadées, ${associated} associées`)

    return NextResponse.json({
      success: true,
      message: `Upload terminé: ${uploaded} images uploadées, ${associated} associées aux luminaires`,
      uploaded,
      associated,
      processed: files.length,
      errors: errors.slice(0, 10),
      totalErrors: errors.length,
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
