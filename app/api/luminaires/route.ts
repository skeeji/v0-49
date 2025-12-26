import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
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

    const globalTotal = await collection.countDocuments({})

    const filter: any = {}
    const andConditions: any[] = []

    if (search) {
      andConditions.push({
        $or: [
          { nom: { $regex: search, $options: "i" } },
          { "Nom luminaire": { $regex: search, $options: "i" } },
          { designer: { $regex: search, $options: "i" } },
          { "Artiste / Dates": { $regex: search, $options: "i" } },
        ],
      })
    }

    if (categorie && categorie !== "all") {
      andConditions.push({
        $or: [{ categorie: categorie }, { Catégorie: categorie }],
      })
    }

    if (materiau && materiau !== "all") {
      andConditions.push({
        $or: [{ materiaux: { $regex: materiau, $options: "i" } }, { Matériaux: { $regex: materiau, $options: "i" } }],
      })
    }

    if (yearMin && yearMax) {
      const min = Number.parseInt(yearMin)
      const max = Number.parseInt(yearMax)
      console.log(`[v0 API] Year filter requested: ${min} - ${max}`)

      andConditions.push({
        $or: [
          { annee: { $gte: min, $lte: max } },
          { year: { $gte: min, $lte: max } },
          { Année: { $gte: min, $lte: max } },
          { annee: { $gte: min.toString(), $lte: max.toString() } },
          { year: { $gte: min.toString(), $lte: max.toString() } },
          { Année: { $gte: min.toString(), $lte: max.toString() } },
        ],
      })
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions
    }

    const sortObject: any = {}
    if (sortField === "nom") {
      sortObject.nom = sortDirection === "asc" ? 1 : -1
    } else if (sortField === "designer") {
      sortObject.designer = sortDirection === "asc" ? 1 : -1
    } else if (sortField === "annee") {
      sortObject.annee = sortDirection === "asc" ? 1 : -1
    }

    const total = await collection.countDocuments(filter)

    const skip = (page - 1) * limit

    const luminaires = await collection.find(filter).sort(sortObject).skip(skip).limit(limit).toArray()

    console.log(`[v0 API] Filter applied:`, JSON.stringify(filter))
    console.log(`[v0 API] Found ${luminaires.length} luminaires out of ${total} total matching filter`)

    return NextResponse.json({
      success: true,
      luminaires: luminaires,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        globalTotal: globalTotal, // Added global total for display
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
