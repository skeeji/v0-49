import { type NextRequest, NextResponse } from "next/server"
import { GridFSBucket, ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

export const runtime = "nodejs"
export const maxDuration = 300

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const projectId = formData.get("projectId") as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Aucun fichier fourni" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "crm_uploads" })

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `crm_${Date.now()}_${file.name}`

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.type || "image/jpeg",
    })

    const fileId = uploadStream.id.toString()

    await new Promise<void>((resolve, reject) => {
      uploadStream.on("error", reject)
      uploadStream.on("finish", () => resolve())
      uploadStream.end(buffer)
    })

    // If projectId is provided, update the project
    if (projectId) {
      const collection = db.collection("crm")

      // Delete old image if exists
      const project = await collection.findOne({ _id: new ObjectId(projectId) })
      if (project?.imageId) {
        try {
          await bucket.delete(new ObjectId(project.imageId))
        } catch (e) {
          console.warn("Could not delete old CRM image:", e)
        }
      }

      await collection.updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { imageId: fileId, updatedAt: new Date() } }
      )
    }

    return NextResponse.json({
      success: true,
      fileId,
    })
  } catch (error: any) {
    console.error("Erreur upload CRM:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
