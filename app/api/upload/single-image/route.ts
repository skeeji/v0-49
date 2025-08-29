import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

// API pour uploader UNE SEULE image à la fois
export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API /api/upload/single-image - Upload d'une image")

    const formData = await request.formData()
    const file = formData.get("image") as File
    const isDesignerImage = formData.get("isDesignerImage") === "true"
    const designer = formData.get("designer") as string

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Vérifier la taille du fichier (max 5MB par image)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `Image trop volumineuse: ${Math.round(file.size / 1024 / 1024)}MB (max 5MB)`,
        },
        { status: 413 },
      )
    }

    console.log(`📁 Upload: ${file.name} (${Math.round(file.size / 1024)}KB)`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Vérifier si le fichier existe déjà
    const existingFile = await bucket.find({ filename: file.name }).toArray()
    if (existingFile.length > 0) {
      console.log(`⚠️ Fichier déjà existant: ${file.name}`)
      return NextResponse.json({
        success: true,
        message: `Image ${file.name} déjà existante`,
        uploaded: 0,
        associated: 1,
        skipped: true,
      })
    }

    // Créer les métadonnées
    const metadata: any = {
      type: isDesignerImage ? "designer-image" : "luminaire-image",
      originalName: file.name,
      uploadDate: new Date(),
      uploadSource: "single_upload",
    }

    if (isDesignerImage) {
      metadata.isDesignerImage = true
      if (designer) {
        metadata.designer = designer
      }
      console.log(`👤 Image de designer: ${file.name}`)
    }

    // Upload du fichier
    const uploadStream = bucket.openUploadStream(file.name, { metadata })
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

    console.log(`✅ Upload réussi: ${file.name}`)

    let associated = 0

    // Associer l'image au luminaire (seulement pour les images de luminaires)
    if (!isDesignerImage) {
      try {
        const queries = [
          { "Nom du fichier": file.name },
          { filename: file.name },
          { "Image luminaire (Nom du fichier)": file.name },
        ]

        for (const query of queries) {
          const result = await db.collection("luminaires").updateOne(query, {
            $set: {
              imageUploaded: true,
              imageId: uploadStream.id,
              updatedAt: new Date(),
            },
          })
          if (result.matchedCount > 0) {
            associated = 1
            console.log(`✅ Image "${file.name}" associée à un luminaire`)
            break
          }
        }

        if (associated === 0) {
          console.log(`⚠️ Aucun luminaire trouvé pour l'image "${file.name}"`)
        }
      } catch (associationError) {
        console.log(`⚠️ Impossible d'associer ${file.name}:`, associationError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Image ${file.name} uploadée avec succès`,
      uploaded: 1,
      associated,
      filename: file.name,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload image:", error)
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
