import { type NextRequest, NextResponse } from "next/server"
import { GridFSBucket, ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "gersaint"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "crm_uploads" })

    const files = await bucket.find({ _id: new ObjectId(id) }).toArray()

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "Image non trouvée" },
        { status: 404 }
      )
    }

    const chunks: Buffer[] = []
    const downloadStream = bucket.openDownloadStream(new ObjectId(id))

    await new Promise<void>((resolve, reject) => {
      downloadStream.on("data", (chunk) => chunks.push(chunk))
      downloadStream.on("end", () => resolve())
      downloadStream.on("error", reject)
    })

    const buffer = Buffer.concat(chunks)
    const contentType = files[0].contentType || "image/jpeg"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
