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
    for (const file of files) {
      const key = file.metadata.homepageKey
      images[key] = `/api/images/${file._id}`
    }

    return NextResponse.json({ success: true, images })
  } catch (error) {
    console.error("Erreur API homepage images:", error)
    return NextResponse.json({ success: false, images: {} })
  }
}
