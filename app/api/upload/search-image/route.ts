import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "gersaint"
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

// Minimal upload for search images — no luminaire association, just store & return URL.
// Used to get a persistent URL instead of a blob:// URL in conversation history.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File | null

    if (!file) return NextResponse.json({ success: false, error: "No file" }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ success: false, error: "File too large" }, { status: 400 })

    // Unique filename: timestamp + original name (avoids collisions)
    const ext = file.name.split(".").pop() || "jpg"
    const filename = `search_${Date.now()}.${ext}`

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = bucket.openUploadStream(filename, {
      contentType: file.type,
      metadata: { source: "search", uploadedAt: new Date() },
    })

    await new Promise<void>((resolve, reject) => {
      stream.end(buffer, (err) => (err ? reject(err) : resolve()))
    })

    return NextResponse.json({
      success: true,
      filename,
      imageUrl: `/api/images/filename/${filename}`,
    })
  } catch (err: any) {
    console.error("[search-image upload]", err)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
