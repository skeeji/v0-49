import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File
    const section = formData.get("section") as string // "luminaire", "designer", "chronologie"
    const index = formData.get("index") as string // "0", "1", "2", etc.

    if (!file || !section) {
      return NextResponse.json({ success: false, message: "Fichier et section requis" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    const metadataKey = `homepage_${section}${index ? `_${index}` : ""}`

    // Delete existing image for this section/index
    const existingFiles = await db.collection("uploads.files").find({ "metadata.homepageKey": metadataKey }).toArray()
    for (const existingFile of existingFiles) {
      await bucket.delete(existingFile._id)
    }

    // Upload new image
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        homepageKey: metadataKey,
        section,
        index: index || "0",
        uploadDate: new Date(),
        contentType: file.type,
      },
    })

    return new Promise((resolve) => {
      uploadStream.end(buffer, () => {
        resolve(
          NextResponse.json({
            success: true,
            message: `Image uploadee pour ${section} #${index || "0"}`,
            fileId: uploadStream.id,
          }),
        )
      })

      uploadStream.on("error", () => {
        resolve(NextResponse.json({ success: false, message: "Erreur lors de l'upload" }, { status: 500 }))
      })
    })
  } catch (error) {
    console.error("Erreur API upload homepage images:", error)
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 })
  }
}
