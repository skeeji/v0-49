import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Récupérer toutes les images de périodes
    const periodImages = await bucket.find({ "metadata.type": "period-image" }).toArray()

    const imagesMap: { [key: string]: string } = {}

    periodImages.forEach((file) => {
      if (file.metadata?.periodName) {
        imagesMap[file.metadata.periodName] = `/api/images/period/${file._id}`
      }
    })

    return NextResponse.json({
      success: true,
      images: imagesMap,
    })
  } catch (error: any) {
    console.error("❌ Erreur récupération images périodes:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
