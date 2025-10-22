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
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") === "desc" ? -1 : 1
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")
    const fields = searchParams.get("fields")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const query: any = {}

    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: "i" } },
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
      ]
    }

    if (categorie && categorie !== "all") {
      query.$or = [{ categorie: categorie }, { Catégorie: categorie }]
    }

    if (materiau && materiau !== "all") {
      query.$or = [
        ...(query.$or || []),
        { materiaux: { $regex: materiau, $options: "i" } },
        { Matériaux: { $regex: materiau, $options: "i" } },
      ]
    }

    if (yearMin && yearMax) {
      const minYear = Number.parseInt(yearMin)
      const maxYear = Number.parseInt(yearMax)
      query.$and = [
        ...(query.$and || []),
        {
          $or: [{ annee: { $gte: minYear, $lte: maxYear } }, { year: { $gte: minYear, $lte: maxYear } }],
        },
      ]
    }

    const skip = (page - 1) * limit

    let sortOptions: any = {}
    if (sortField === "designer") {
      sortOptions = { designer: sortDirection, "Artiste / Dates": sortDirection }
    } else if (sortField === "annee") {
      sortOptions = { annee: sortDirection, year: sortDirection }
    } else {
      sortOptions = { [sortField]: sortDirection, "Nom luminaire": sortDirection }
    }

    // Projection des champs si spécifié
    const projection: any = {}
    if (fields) {
      const fieldList = fields.split(",")
      fieldList.forEach((field) => {
        projection[field] = 1
      })
    }

    const total = await collection.countDocuments(query)

    const luminairesQuery = fields
      ? collection.find(query, { projection }).sort(sortOptions).skip(skip).limit(limit)
      : collection.find(query).sort(sortOptions).skip(skip).limit(limit)

    const luminaires = await luminairesQuery.toArray()

    return NextResponse.json({
      success: true,
      luminaires,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + luminaires.length < total,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur récupération luminaires:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des luminaires",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const luminaireData = await request.json()

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.insertOne({
      ...luminaireData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      id: result.insertedId,
      message: "Luminaire créé avec succès",
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
