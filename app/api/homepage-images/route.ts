import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    const files = await db
      .collection("uploads.files")
      .find({ "metadata.homepageKey": { $exists: true } })
      .toArray()

    const images: Record<string, string> = {}
    const metadata: Record<string, any> = {}
    for (const file of files) {
      const key = file.metadata.homepageKey
      images[key] = `/api/images/${file._id}`
      metadata[key] = {
        designerName: file.metadata.designerName || null,
        section: file.metadata.section || null,
        index: file.metadata.index || "0",
      }
    }

    return NextResponse.json({ success: true, images, metadata })
  } catch (error) {
    console.error("Erreur API homepage images:", error)
    return NextResponse.json({ success: false, images: {} })
  }
}
