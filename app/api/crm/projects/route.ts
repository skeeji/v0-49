import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("crm")

    const filter: any = {}
    const andConditions: any[] = []

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ],
      })
    }

    if (status && status !== "all") {
      andConditions.push({ status })
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions
    }

    const projects = await collection
      .find(filter)
      .sort({
        _statusOrder: 1,
        updatedAt: -1,
      })
      .toArray()

    // Sort by status pipeline order
    const statusOrder: Record<string, number> = {
      "En negociation": 0,
      "Devis envoye": 1,
      "En cours": 2,
      "Gagne": 3,
      "Gagné": 3,
      "Perdu": 4,
    }

    projects.sort((a, b) => {
      const orderA = statusOrder[a.status] ?? 3
      const orderB = statusOrder[b.status] ?? 3
      if (orderA !== orderB) return orderA - orderB
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    })

    // Calculate stats
    const allProjects = await collection.find({}).toArray()
    const activeStatuses = ["En negociation", "Devis envoye", "En cours"]
    const caEnCours = allProjects
      .filter((p) => activeStatuses.includes(p.status))
      .reduce((sum, p) => sum + (p.budget || 0), 0)
    const caGagne = allProjects
      .filter((p) => p.status === "Gagne" || p.status === "Gagné")
      .reduce((sum, p) => sum + (p.budget || 0), 0)
    const projetsActifs = allProjects.filter((p) => activeStatuses.includes(p.status)).length

    return NextResponse.json({
      success: true,
      projects,
      stats: {
        caEnCours,
        caGagne,
        projetsActifs,
      },
    })
  } catch (error: any) {
    console.error("Erreur API /api/crm/projects:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("crm")

    const project = {
      name: body.name || "",
      status: body.status || "En cours",
      budget: body.budget || 0,
      progress: body.progress || 0,
      timeSpent: body.timeSpent || 0,
      timeEstimated: body.timeEstimated || 0,
      deadline: body.deadline || null,
      notes: body.notes || "",
      actions: body.actions || [],
      driveLink: body.driveLink || "",
      imageId: body.imageId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(project)

    return NextResponse.json({
      success: true,
      id: result.insertedId,
      project: { ...project, _id: result.insertedId },
    })
  } catch (error: any) {
    console.error("Erreur creation projet CRM:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
