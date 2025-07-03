import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File
    const luminaireId = formData.get("luminaireId") as string

    if (!image || !luminaireId) {
      return NextResponse.json({ success: false, error: "Image et ID luminaire requis" }, { status: 400 })
    }

    if (!ObjectId.isValid(luminaireId)) {
      return NextResponse.json({ success: false, error: "ID luminaire invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Convertir le fichier en buffer
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const filename = `luminaire_${luminaireId}_${timestamp}_${image.name}`

    // Upload vers GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: image.name,
        contentType: image.type,
        luminaireId: luminaireId,
        uploadedAt: new Date(),
      },
    })

    await new Promise((resolve, reject) => {
      uploadStream.end(buffer, (error) => {
        if (error) reject(error)
        else resolve(uploadStream.id)
      })
    })

    // Mettre à jour le luminaire avec le nom du fichier
    const collection = db.collection("luminaires")
    await collection.updateOne(
      { _id: new ObjectId(luminaireId) },
      {
        $push: { images: filename },
        $set: { updatedAt: new Date() },
      },
    )

    console.log(`✅ Image associée au luminaire ${luminaireId}: ${filename}`)

    return NextResponse.json({
      success: true,
      message: "Image associée avec succès",
      filename: filename,
    })
  } catch (error: any) {
    console.error("❌ Erreur association image:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
