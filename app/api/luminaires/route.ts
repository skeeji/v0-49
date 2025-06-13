import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { Luminaire } from "@/lib/models/Luminaire"

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const searchParams = request.nextUrl.searchParams

    // Construire le filtre
    const filter: any = {}

    if (searchParams.get("search")) {
      filter.$text = { $search: searchParams.get("search") }
    }

    if (searchParams.get("designer")) {
      filter.designer = searchParams.get("designer")
    }

    if (searchParams.get("periode")) {
      filter.periode = searchParams.get("periode")
    }

    if (searchParams.get("materiaux")) {
      filter.materiaux = { $in: searchParams.get("materiaux")?.split(",") }
    }

    if (searchParams.get("couleurs")) {
      filter.couleurs = { $in: searchParams.get("couleurs")?.split(",") }
    }

    if (searchParams.get("anneeMin") || searchParams.get("anneeMax")) {
      filter.annee = {}
      if (searchParams.get("anneeMin")) {
        filter.annee.$gte = Number.parseInt(searchParams.get("anneeMin")!)
      }
      if (searchParams.get("anneeMax")) {
        filter.annee.$lte = Number.parseInt(searchParams.get("anneeMax")!)
      }
    }

    if (searchParams.get("isFavorite") === "true") {
      filter.isFavorite = true
    }

    // Construire le tri
    const sortField = searchParams.get("sortField") || "createdAt"
    const sortDirection = searchParams.get("sortDirection") === "asc" ? 1 : -1
    const sort = { [sortField]: sortDirection }

    // Pagination
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const luminaires = await db.collection("luminaires").find(filter).sort(sort).skip(skip).limit(limit).toArray()

    const total = await db.collection("luminaires").countDocuments(filter)

    return NextResponse.json({
      luminaires,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des luminaires:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase()
    const luminaire: Omit<Luminaire, "_id"> = await request.json()

    const newLuminaire = {
      ...luminaire,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("luminaires").insertOne(newLuminaire)

    return NextResponse.json(
      {
        _id: result.insertedId,
        ...newLuminaire,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erreur lors de la création du luminaire:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
