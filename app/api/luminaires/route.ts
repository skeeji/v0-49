import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)

    // Paramètres de pagination
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // Paramètres de filtrage
    const search = searchParams.get("search")
    const designer = searchParams.get("designer")
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"
    const stats = searchParams.get("stats") === "true"

    // Si on demande juste les stats
    if (stats) {
      const pipeline = [
        {
          $group: {
            _id: null,
            minYear: { $min: { $ifNull: ["$annee", { $ifNull: ["$year", "$Année"] }] } },
            maxYear: { $max: { $ifNull: ["$annee", { $ifNull: ["$year", "$Année"] }] } },
            total: { $sum: 1 },
          },
        },
      ]

      const statsResult = await db.collection("luminaires").aggregate(pipeline).toArray()
      const yearBounds = statsResult[0]
        ? {
            min: statsResult[0].minYear || 1900,
            max: statsResult[0].maxYear || 2024,
          }
        : { min: 1900, max: 2024 }

      return NextResponse.json({
        success: true,
        yearBounds,
        total: statsResult[0]?.total || 0,
      })
    }

    // Construction du filtre MongoDB
    const filter: any = {}

    // Filtre de recherche textuelle
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { "Nom du luminaire": { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { "Designer/Fabricant": { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
      ]
    }

    // Filtre par designer
    if (designer) {
      filter.$or = [
        { designer: { $regex: designer, $options: "i" } },
        { "Designer/Fabricant": { $regex: designer, $options: "i" } },
      ]
    }

    // Filtre par années - logique simplifiée
    if (yearMin || yearMax) {
      const yearFilter: any = {}

      if (yearMin) {
        yearFilter.$gte = Number.parseInt(yearMin)
      }
      if (yearMax) {
        yearFilter.$lte = Number.parseInt(yearMax)
      }

      // Chercher dans tous les champs d'année possibles
      filter.$or = [{ annee: yearFilter }, { year: yearFilter }, { Année: yearFilter }]
    }

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter, null, 2))

    // Construction du tri
    const sortOptions: any = {}
    let sortKey = sortField

    // Mapper les champs de tri
    if (sortField === "nom") {
      sortKey = "nom"
    } else if (sortField === "designer") {
      sortKey = "designer"
    } else if (sortField === "annee") {
      sortKey = "annee"
    }

    sortOptions[sortKey] = sortDirection === "desc" ? -1 : 1

    // Requête principale avec agrégation pour gérer les champs multiples
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          // Normaliser les champs pour le tri
          nom: { $ifNull: ["$nom", "$Nom du luminaire"] },
          designer: { $ifNull: ["$designer", "$Designer/Fabricant"] },
          annee: { $ifNull: ["$annee", { $ifNull: ["$year", "$Année"] }] },
        },
      },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: limit },
    ]

    const luminaires = await db.collection("luminaires").aggregate(pipeline).toArray()

    // Compter le total avec le même filtre
    const totalCount = await db.collection("luminaires").countDocuments(filter)

    console.log(`📊 Trouvé ${luminaires.length} luminaires sur ${totalCount} total`)

    return NextResponse.json({
      success: true,
      luminaires,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + luminaires.length < totalCount,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur API luminaires:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const data = await request.json()

    const result = await db.collection("luminaires").insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      id: result.insertedId,
    })
  } catch (error: any) {
    console.error("❌ Erreur création luminaire:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
