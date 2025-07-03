import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File | null
    const luminaireId = formData.get("luminaireId") as string | null

    if (!file || !luminaireId) {
      return NextResponse.json({ error: "Fichier ou ID du luminaire manquant" }, { status: 400 })
    }

    console.log(`🖼️ Association de l'image ${file.name} au luminaire ${luminaireId}`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const luminairesCollection = db.collection("luminaires")

    // 1. Upload du fichier
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
        if (error) reject(error)
        else resolve()
      })
    })

    console.log(`✅ Fichier uploadé avec l'ID GridFS: ${uploadStream.id}`)

    // 2. Association avec le luminaire
    const result = await luminairesCollection.updateOne(
      { _id: new ObjectId(luminaireId) },
      {
        $set: {
          imageUploaded: true,
          imageId: uploadStream.id,
          images: [file.name],
          filename: file.name,
          "Nom du fichier": file.name,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      throw new Error("Impossible de trouver le luminaire pour l'associer.")
    }

    console.log(`✅ Association réussie pour le luminaire ${luminaireId}`)

    return NextResponse.json({ success: true, message: "Image associée avec succès." })
  } catch (error: any) {
    console.error("❌ Erreur d'association d'image:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
