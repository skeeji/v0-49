import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, type ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = decodeURIComponent(params.filename)

    const client = await clientPromise
    const db = client.db(DBNAME)

    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    const files = await db.collection("uploads.files").find({ filename }).toArray()

    if (!files || files.length === 0) {
      return new NextResponse("Image not found", { status: 404 })
    }

    const file = files[0]
    const downloadStream = bucket.openDownloadStream(file._id as ObjectId)

    // Stream the image
    return new NextResponse(downloadStream as any, {
      headers: {
        "Content-Type": file.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error: any) {
    console.error(`Erreur lors de la recherche de l'image ${params.filename}:`, error)
    return new NextResponse("Error fetching image", { status: 500 })
  }
}
