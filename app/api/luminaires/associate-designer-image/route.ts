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

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const luminairesCollection = db.collection("luminaires")

    // Upload
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: { type: "designer-image", originalName: file.name, uploadDate: new Date() },
    })
    const buffer = await file.arrayBuffer()
    await new Promise<void>((resolve, reject) => {
      uploadStream.end(new Uint8Array(buffer), (error) => {
        if (error) reject(error)
        else resolve()
      })
    })

    // Association
    const result = await luminairesCollection.updateOne(
      { _id: new ObjectId(luminaireId) },
      {
        $set: {
          designerImageId: uploadStream.id,
          designerImageFilename: file.name,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      throw new Error("Impossible de trouver le luminaire pour associer l'image du designer.")
    }

    return NextResponse.json({ success: true, message: "Image designer associée." })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
