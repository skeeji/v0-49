import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("👨‍🎨 API /api/designers - Récupération des designers")

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    console.log(
      `📊 Paramètres designers: page=${page}, limit=${limit}, search="${search}", sortField=${sortField}, sortDirection=${sortDirection}`,
    )

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("designers")

    // Construire le filtre de recherche
    const filter: any = {}

    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { Nom: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { biographie: { $regex: search, $options: "i" } },
      ]
    }

    console.log("🔍 Filtre MongoDB designers:", JSON.stringify(filter))

    // Construire le tri
    const sort: any = {}
    let sortFilter = { ...filter }

    if (sortField === "nom") {
      // Tri par nom - inclure tous les designers qui ont un nom
      sortFilter = {
        ...filter,
        $and: [
          ...(filter.$and || []),
          {
            $or: [{ nom: { $exists: true, $ne: null, $ne: "" } }, { Nom: { $exists: true, $ne: null, $ne: "" } }],
          },
        ],
      }
      sort.nom = sortDirection === "desc" ? -1 : 1
      sort.Nom = sortDirection === "desc" ? -1 : 1
    } else if (sortField === "annee") {
      // Tri par année - extraire l'année des dates dans "Artiste / Dates"
      const pipeline = [
        { $match: sortFilter },
        {
          $addFields: {
            extractedYear: {
              $toInt: {
                $arrayElemAt: [
                  {
                    $regexFindAll: {
                      input: { $ifNull: ["$Artiste / Dates", ""] },
                      regex: /(\d{4})/,
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
        {
          $match: {
            extractedYear: { $exists: true, $ne: null },
          },
        },
        { $sort: { extractedYear: sortDirection === "desc" ? -1 : 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]

      const designers = await collection.aggregate(pipeline).toArray()
      const totalPipeline = [
        { $match: sortFilter },
        {
          $addFields: {
            extractedYear: {
              $toInt: {
                $arrayElemAt: [
                  {
                    $regexFindAll: {
                      input: { $ifNull: ["$Artiste / Dates", ""] },
                      regex: /(\d{4})/,
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
        {
          $match: {
            extractedYear: { $exists: true, $ne: null },
          },
        },
        { $count: "total" },
      ]

      const totalResult = await collection.aggregate(totalPipeline).toArray()
      const total = totalResult[0]?.total || 0

      const formattedDesigners = designers.map((designer) => ({
        ...designer,
        id: designer._id.toString(),
        image: designer.imagedesigner ? `/api/images/filename/${designer.imagedesigner}` : null,
      }))

      return NextResponse.json({
        success: true,
        designers: formattedDesigners,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      })
    } else {
      sort[sortField] = sortDirection === "desc" ? -1 : 1
    }

    // Compter le total avec le bon filtre
    const total = await collection.countDocuments(sortFilter)
    console.log(`📊 Total designers trouvés: ${total}`)

    // Récupérer les designers avec pagination
    const skip = (page - 1) * limit
    const designers = await collection.find(sortFilter).sort(sort).skip(skip).limit(limit).toArray()

    console.log(`📊 ${designers.length} designers récupérés pour la page ${page}`)

    // Formater les designers pour l'affichage
    const formattedDesigners = designers.map((designer) => ({
      ...designer,
      id: designer._id.toString(),
      image: designer.imagedesigner ? `/api/images/filename/${designer.imagedesigner}` : null,
    }))

    const response = {
      success: true,
      designers: formattedDesigners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur API /api/designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
