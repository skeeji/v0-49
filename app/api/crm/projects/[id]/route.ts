import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("crm")

    const project = await collection.findOne({ _id: new ObjectId(id) })

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Projet non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, project })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("crm")

    // Remove _id from update body if present
    const { _id, ...updateData } = body

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Projet non trouvé" },
        { status: 404 }
      )
    }

    const updated = await collection.findOne({ _id: new ObjectId(id) })

    return NextResponse.json({ success: true, project: updated })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("crm")

    // If project has an image, delete it from GridFS
    const project = await collection.findOne({ _id: new ObjectId(id) })
    if (project?.imageId) {
      try {
        const { GridFSBucket } = await import("mongodb")
        const bucket = new GridFSBucket(db, { bucketName: "crm_uploads" })
        await bucket.delete(new ObjectId(project.imageId))
      } catch (e) {
        console.warn("Could not delete CRM image:", e)
      }
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Projet non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
