import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "crm_uploads" })

    const fileInfo = await db.collection("crm_uploads.files").findOne({ _id: new ObjectId(id) })

    if (!fileInfo) {
      return NextResponse.json({ error: "Image non trouvee" }, { status: 404 })
    }

    const chunks: Buffer[] = []
    const downloadStream = bucket.openDownloadStream(new ObjectId(id))

    await new Promise<void>((resolve, reject) => {
      downloadStream.on("data", (chunk) => chunks.push(chunk))
      downloadStream.on("end", () => resolve())
      downloadStream.on("error", reject)
    })

    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": fileInfo.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error: any) {
    console.error("Error serving CRM image:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
