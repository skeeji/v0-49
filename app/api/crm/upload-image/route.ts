import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 },
      )
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "crm_uploads" })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const filename = `crm_${Date.now()}_${file.name}`

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.type,
      metadata: {
        uploadedAt: new Date(),
        originalName: file.name,
        collection: "crm",
      },
    })

    await new Promise<void>((resolve, reject) => {
      uploadStream.end(buffer, (error: any) => {
        if (error) reject(error)
        else resolve()
      })
    })

    return NextResponse.json({
      success: true,
      imageId: uploadStream.id.toString(),
      filename,
    })
  } catch (error: any) {
    console.error("Error uploading CRM image:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
