import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

const DBNAME      = process.env.MONGO_INITDB_DATABASE || "luminaires"
const BUCKET_NAME = "galerie_images"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise
    const db     = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })
    const fileId = new ObjectId(params.id)

    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      const stream = bucket.openDownloadStream(fileId)
      stream.on("data",  chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      stream.on("end",   resolve)
      stream.on("error", reject)
    })

    return new Response(Buffer.concat(chunks), {
      headers: {
        "Content-Type":  "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 })
  }
}
