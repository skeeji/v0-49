import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, type ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = decodeURIComponent(params.filename)
    console.log(`[v0] Fetching image: ${filename}`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    const searchVariants = [
      filename,
      filename.toLowerCase(),
      filename.toUpperCase(),
      // Essayer sans extension si elle existe
      filename.replace(/\.[^/.]+$/, ""),
      // Essayer avec des extensions communes
      `${filename.replace(/\.[^/.]+$/, "")}.jpg`,
      `${filename.replace(/\.[^/.]+$/, "")}.jpeg`,
      `${filename.replace(/\.[^/.]+$/, "")}.png`,
    ]

    console.log(`[v0] Searching with variants:`, searchVariants)

    const files = await db
      .collection("uploads.files")
      .find({
        $or: searchVariants.map((variant) => ({ filename: variant })),
      })
      .toArray()

    if (!files || files.length === 0) {
      console.error(`[v0] Image not found: ${filename}`)
      console.log(`[v0] Searched variants:`, searchVariants)
      return new NextResponse("Image not found", { status: 404 })
    }

    const file = files[0]
    console.log(`[v0] Image found: ${file.filename}`)

    const downloadStream = bucket.openDownloadStream(file._id as ObjectId)

    // Stream the image
    return new NextResponse(downloadStream as any, {
      headers: {
        "Content-Type": file.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error: any) {
    console.error(`[v0] Error fetching image ${params.filename}:`, error)
    return new NextResponse("Error fetching image", { status: 500 })
  }
}
