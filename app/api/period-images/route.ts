import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "period-images" })

    // Récupérer toutes les images de périodes
    const files = await bucket.find({}).toArray()

    const images: { [key: string]: string } = {}

    files.forEach((file) => {
      if (file.metadata?.periodName) {
        images[file.metadata.periodName] = `/api/images/period/${file._id}`
      }
    })

    return NextResponse.json({
      success: true,
      images: images,
    })
  } catch (error: any) {
    console.error("Erreur récupération images périodes:", error)
    return NextResponse.json({ success: false, message: "Erreur serveur", error: error.message }, { status: 500 })
  }
}
