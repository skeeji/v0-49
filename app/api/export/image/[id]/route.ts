import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    const file = await bucket.find({ _id: new ObjectId(params.id) }).toArray()

    if (!file || file.length === 0) {
      return NextResponse.json({ success: false, error: "Fichier non trouvé" }, { status: 404 })
    }

    const downloadStream = bucket.openDownloadStream(new ObjectId(params.id))
    const chunks: Buffer[] = []

    for await (const chunk of downloadStream) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file[0].contentType || "image/jpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur téléchargement image:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
