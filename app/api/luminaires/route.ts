import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const categorie = searchParams.get("categorie") || ""
    const materiau = searchParams.get("materiau") || ""
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Construire le filtre
    const filter: any = {}

    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { Nom: { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { Designer: { $regex: search, $options: "i" } },
        { "Designer (name)": { $regex: search, $options: "i" } },
      ]
    }

    if (categorie && categorie !== "all") {
      filter.$or = [{ categorie: categorie }, { Catégorie: categorie }]
    }

    if (materiau && materiau !== "all") {
      filter.$or = [
        { materiaux: { $regex: materiau, $options: "i" } },
        { Matériaux: { $regex: materiau, $options: "i" } },
      ]
    }

    if (yearMin && yearMax) {
      const min = Number.parseInt(yearMin)
      const max = Number.parseInt(yearMax)
      filter.$or = [
        { annee: { $gte: min, $lte: max } },
        { year: { $gte: min, $lte: max } },
        { Année: { $gte: min, $lte: max } },
      ]
    }

    // Construire le tri
    const sortObject: any = {}
    if (sortField === "nom") {
      sortObject.nom = sortDirection === "asc" ? 1 : -1
    } else if (sortField === "designer") {
      sortObject.designer = sortDirection === "asc" ? 1 : -1
    } else if (sortField === "annee") {
      sortObject.annee = sortDirection === "asc" ? 1 : -1
    }

    // Compter le total
    const total = await collection.countDocuments(filter)

    // Récupérer les luminaires avec pagination
    const skip = (page - 1) * limit
    const luminaires = await collection.find(filter).sort(sortObject).skip(skip).limit(limit).toArray()

    console.log(`📊 API /api/luminaires: ${luminaires.length} luminaires retournés (page ${page}, total ${total})`)

    return NextResponse.json({
      success: true,
      luminaires: luminaires,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        hasMore: skip + luminaires.length < total,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du chargement des luminaires",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.insertOne(body)

    return NextResponse.json({
      success: true,
      id: result.insertedId,
    })
  } catch (error: any) {
    console.error("❌ Erreur création luminaire:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la création du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
