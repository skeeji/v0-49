import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File
    const section = formData.get("section") as string
    const index = formData.get("index") as string
    const designerName = formData.get("designerName") as string | null

    if (!file || !section) {
      return NextResponse.json({ success: false, message: "Fichier et section requis" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    const metadataKey = `homepage_${section}_${index || "0"}`

    // Remove existing image for this key
    const existing = await db.collection("uploads.files").find({ "metadata.homepageKey": metadataKey }).toArray()
    for (const f of existing) {
      await bucket.delete(f._id)
    }

    // Upload new image
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        homepageKey: metadataKey,
        section,
        index: index || "0",
        designerName: designerName || null,
        uploadDate: new Date(),
        contentType: file.type,
      },
    })

    return new Promise((resolve) => {
      uploadStream.end(buffer, () => {
        resolve(
          NextResponse.json({
            success: true,
            message: `Image uploadee pour ${section} #${index}`,
            fileId: uploadStream.id,
          }),
        )
      })
      uploadStream.on("error", () => {
        resolve(NextResponse.json({ success: false, message: "Erreur upload" }, { status: 500 }))
      })
    })
  } catch (error) {
    console.error("Erreur API upload homepage images:", error)
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 })
  }
}
