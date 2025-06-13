import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { Designer } from "@/lib/models/Designer"

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const searchParams = request.nextUrl.searchParams

    const filter: any = {}

    if (searchParams.get("search")) {
      filter.$or = [
        { nom: { $regex: searchParams.get("search"), $options: "i" } },
        { biographie: { $regex: searchParams.get("search"), $options: "i" } },
      ]
    }

    const designers = await db.collection("designers").find(filter).sort({ nom: 1 }).toArray()

    // Calculer le nombre de luminaires pour chaque designer
    for (const designer of designers) {
      const count = await db.collection("luminaires").countDocuments({ designer: designer.nom })
      designer.luminairesCount = count
    }

    return NextResponse.json(designers)
  } catch (error) {
    console.error("Erreur lors de la récupération des designers:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase()
    const designer: Omit<Designer, "_id"> = await request.json()

    const newDesigner = {
      ...designer,
      slug: designer.nom.toLowerCase().replace(/\s+/g, "-"),
      luminairesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("designers").insertOne(newDesigner)

    return NextResponse.json(
      {
        _id: result.insertedId,
        ...newDesigner,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erreur lors de la création du designer:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
