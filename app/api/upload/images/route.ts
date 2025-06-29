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
      return NextResponse.json({ error: "Aucun fichier image fourni" }, { status: 400 })
    }

    console.log(`📁 ${files.length} fichiers images reçus`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    let uploaded = 0
    let associated = 0
    const errors = []

    // Traiter chaque fichier
    for (const file of files) {
      try {
        console.log(`📤 Upload de ${file.name} (${file.size} bytes)`)

        // Vérifier si le fichier existe déjà
        const existingFile = await bucket.find({ filename: file.name }).toArray()
        if (existingFile.length > 0) {
          console.log(`⚠️ Fichier ${file.name} existe déjà, suppression de l'ancien`)
          await bucket.delete(existingFile[0]._id)
        }

        // Upload du fichier
        const uploadStream = bucket.openUploadStream(file.name, {
          metadata: {
            originalName: file.name,
            uploadDate: new Date(),
            type: "luminaire-image",
          },
        })

        const buffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(buffer)

        await new Promise((resolve, reject) => {
          uploadStream.end(uint8Array, (error) => {
            if (error) {
              reject(error)
            } else {
              resolve(uploadStream.id)
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
          console.log(`🔗 Image ${file.name} associée au luminaire ${luminaire["Nom luminaire"] || "sans nom"}`)
        }
      } catch (error: any) {
        console.error(`❌ Erreur upload ${file.name}:`, error)
        errors.push(`${file.name}: ${error.message}`)
      }
    }

    console.log(`✅ Upload terminé: ${uploaded} fichiers uploadés, ${associated} associés`)

    return NextResponse.json({
      success: true,
      message: `Upload terminé: ${uploaded} images uploadées, ${associated} associées aux luminaires`,
      uploaded,
      associated,
      total: files.length,
      errors: errors.slice(0, 10),
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
