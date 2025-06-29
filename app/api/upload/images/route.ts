import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API /api/upload/images - Début de l'upload images")

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 ${files.length} fichiers images reçus`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    let uploaded = 0
    let associated = 0
    const errors: string[] = []

    // Traiter les fichiers par petits batches
    const BATCH_SIZE = 10
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE)
      console.log(`📦 Traitement batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)}`)

      for (const file of batch) {
        try {
          // Vérifier si le fichier existe déjà
          const existingFile = await bucket.find({ filename: file.name }).toArray()
          if (existingFile.length > 0) {
            console.log(`⚠️ Fichier déjà existant: ${file.name}`)
            continue
          }

          // Upload du fichier
          const uploadStream = bucket.openUploadStream(file.name, {
            metadata: {
              originalName: file.name,
              contentType: file.type,
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

          // Vérifier si ce fichier correspond à un luminaire
          const luminaire = await db.collection("luminaires").findOne({
            "Nom du fichier": file.name,
          })

          if (luminaire) {
            associated++
            console.log(`🔗 Image associée: ${file.name} -> ${luminaire["Nom luminaire"] || "Sans nom"}`)
          }

          if (uploaded % 50 === 0) {
            console.log(`📊 ${uploaded} images uploadées...`)
          }
        } catch (error: any) {
          const errorMsg = `${file.name}: ${error.message}`
          errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      // Pause entre les batches
      if (i + BATCH_SIZE < files.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`✅ Upload terminé: ${uploaded} images uploadées, ${associated} associées`)

    return NextResponse.json({
      success: true,
      message: `${uploaded} images uploadées avec succès, ${associated} associées à des luminaires`,
      uploaded,
      associated,
      processed: files.length,
      errors: errors.slice(0, 50),
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload images",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
