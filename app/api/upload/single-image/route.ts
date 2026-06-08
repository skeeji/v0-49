import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "gersaint"
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File
    const isDesignerImage = formData.get("isDesignerImage") === "true"

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 },
      )
    }

    const filename = file.name
    console.log(`📁 Upload image: ${filename}, taille: ${Math.round(file.size / 1024)}KB`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Vérifier si le fichier existe déjà
    const existingFile = await db.collection("uploads.files").findOne({ filename })

    if (existingFile) {
      console.log(`⚠️  Image ${filename} existe déjà, skip upload mais association quand même`)

      // Même si l'image existe, on l'associe aux luminaires
      if (!isDesignerImage) {
        const luminairesCollection = db.collection("luminaires")

        // Chercher les luminaires qui ont ce nom de fichier dans une colonne
        const luminaires = await luminairesCollection
          .find({
            $or: [
              { "Image luminaire (Nom du fichier)": filename },
              { "Nom du fichier": filename },
              { filename: filename },
            ],
          })
          .toArray()

        console.log(`🔗 ${luminaires.length} luminaires trouvés pour ${filename}`)

        // Mettre à jour tous ces luminaires avec le filename
        for (const luminaire of luminaires) {
          await luminairesCollection.updateOne(
            { _id: luminaire._id },
            {
              $set: {
                filename: filename,
                "Nom du fichier": filename,
                "Image luminaire (Nom du fichier)": filename,
                updatedAt: new Date(),
              },
            },
          )
        }

        return NextResponse.json({
          success: true,
          message: `Image déjà existante, ${luminaires.length} luminaires associés`,
          skipped: true,
          associated: luminaires.length,
        })
      } else {
        return NextResponse.json({
          success: true,
          message: "Image designer déjà existante",
          skipped: true,
        })
      }
    }

    // Uploader l'image dans GridFS
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.type,
      metadata: {
        uploadedAt: new Date(),
        isDesignerImage,
      },
    })

    await new Promise<void>((resolve, reject) => {
      uploadStream.end(buffer, (error) => {
        if (error) reject(error)
        else resolve()
      })
    })

    console.log(`✅ Image ${filename} uploadée avec succès`)

    // Associer l'image aux luminaires si ce n'est pas une image de designer
    if (!isDesignerImage) {
      const luminairesCollection = db.collection("luminaires")

      const luminaires = await luminairesCollection
        .find({
          $or: [
            { "Image luminaire (Nom du fichier)": filename },
            { "Nom du fichier": filename },
            { filename: filename },
          ],
        })
        .toArray()

      console.log(`🔗 ${luminaires.length} luminaires trouvés pour ${filename}`)

      // Mettre à jour tous ces luminaires
      for (const luminaire of luminaires) {
        await luminairesCollection.updateOne(
          { _id: luminaire._id },
          {
            $set: {
              filename: filename,
              "Nom du fichier": filename,
              "Image luminaire (Nom du fichier)": filename,
              updatedAt: new Date(),
            },
          },
        )
      }

      return NextResponse.json({
        success: true,
        message: `Image uploadée et ${luminaires.length} luminaires associés`,
        uploaded: 1,
        associated: luminaires.length,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Image designer uploadée",
      uploaded: 1,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload image:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'upload",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
