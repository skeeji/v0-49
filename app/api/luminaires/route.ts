import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") === "desc" ? -1 : 1

    console.log(`🔍 API /api/luminaires - page=${page}, limit=${limit}, search="${search}"`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Construction du filtre de recherche
    const filter: any = {}
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }

    // Compter le total
    const total = await collection.countDocuments(filter)

    // Récupérer les luminaires avec pagination
    const skip = (page - 1) * limit
    const luminaires = await collection
      .find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .toArray()

    // Calculer hasMore
    const hasMore = skip + luminaires.length < total

    console.log(`✅ Retourné ${luminaires.length} luminaires sur ${total} (page ${page})`)

    return NextResponse.json({
      luminaires: luminaires.map((lum) => ({
        ...lum,
        _id: lum._id.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des luminaires",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("📝 Création d'un nouveau luminaire:", body.nom)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.insertOne({
      ...body,
      createdAt: new Date(),
    })

    console.log(`✅ Luminaire créé avec _id: ${result.insertedId}`)

    return NextResponse.json({
      success: true,
      _id: result.insertedId.toString(),
    })
  } catch (error: any) {
    console.error("❌ Erreur création luminaire:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la création du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
