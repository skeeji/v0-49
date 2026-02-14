import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const projects = await db.collection("crm_projects").find({}).sort({ createdAt: -1 }).toArray()
    return NextResponse.json({ success: true, projects })
  } catch (error: any) {
    console.error("Error fetching CRM projects:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db(DBNAME)

    const project = {
      nom: body.nom || "",
      statut: body.statut || "En cours",
      budget: body.budget || 0,
      progression: body.progression || 0,
      tempsEstime: body.tempsEstime || 0,
      tempsPasse: body.tempsPasse || 0,
      dateButoire: body.dateButoire || "",
      notes: body.notes || "",
      googleDriveLink: body.googleDriveLink || "",
      imageId: body.imageId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("crm_projects").insertOne(project)
    return NextResponse.json({ success: true, id: result.insertedId, project: { ...project, _id: result.insertedId } })
  } catch (error: any) {
    console.error("Error creating CRM project:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { _id, ...updateData } = body

    if (!_id) {
      return NextResponse.json({ success: false, error: "ID requis" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)

    updateData.updatedAt = new Date()

    const result = await db.collection("crm_projects").updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Projet non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error updating CRM project:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID requis" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)

    const result = await db.collection("crm_projects").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Projet non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting CRM project:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
