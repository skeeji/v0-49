import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("👤 API /api/luminaires/associate-designer-image - Association image designer")

    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const luminaireId = formData.get("luminaireId") as string

    if (!imageFile || !luminaireId) {
      return NextResponse.json({ success: false, error: "Image ou ID luminaire manquant" }, { status: 400 })
    }

    if (!ObjectId.isValid(luminaireId)) {
      return NextResponse.json({ success: false, error: "ID luminaire invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Générer un nom de fichier unique pour l'image du designer
    const timestamp = Date.now()
    const originalName = imageFile.name.replace(/\.[^/.]+$/, "")
    const extension = imageFile.name.split(".").pop()
    const designerImageFilename = `designer_${originalName}_${timestamp}.${extension}`

    console.log(`📁 Upload image designer: ${designerImageFilename}`)

    // Convertir le File en Buffer
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload vers GridFS
    const uploadStream = bucket.openUploadStream(designerImageFilename, {
      metadata: {
        type: "designer-image",
        luminaireId: luminaireId,
        originalName: imageFile.name,
        uploadDate: new Date(),
      },
    })

    await new Promise((resolve, reject) => {
      uploadStream.end(buffer, (error) => {
        if (error) reject(error)
        else resolve(uploadStream.id)
      })
    })

    console.log(`✅ Image designer uploadée: ${designerImageFilename}`)

    // CORRECTION: Mettre à jour le luminaire avec le nom du fichier de l'image du designer
    const luminairesCollection = db.collection("luminaires")
    const updateResult = await luminairesCollection.updateOne(
      { _id: new ObjectId(luminaireId) },
      {
        $set: {
          designerImageFilename: designerImageFilename,
          updatedAt: new Date(),
        },
      },
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log(`✅ Luminaire ${luminaireId} mis à jour avec l'image designer: ${designerImageFilename}`)

    // CORRECTION: Aussi mettre à jour la collection designers-data si elle existe
    try {
      const designersCollection = db.collection("designers-data")

      // Récupérer le nom du designer depuis le luminaire
      const luminaire = await luminairesCollection.findOne({ _id: new ObjectId(luminaireId) })
      if (luminaire) {
        const designerName = luminaire.designer || luminaire["Artiste / Dates"]
        if (designerName) {
          await designersCollection.updateOne(
            { Nom: designerName },
            {
              $set: {
                imagedesigner: designerImageFilename,
                updatedAt: new Date(),
              },
            },
            { upsert: true },
          )
          console.log(`✅ Collection designers-data mise à jour pour: ${designerName}`)
        }
      }
    } catch (error) {
      console.log("⚠️ Erreur mise à jour designers-data (non critique):", error)
    }

    return NextResponse.json({
      success: true,
      message: "Image du designer associée avec succès",
      designerImageFilename,
    })
  } catch (error: any) {
    console.error("❌ Erreur association image designer:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'association de l'image du designer",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
