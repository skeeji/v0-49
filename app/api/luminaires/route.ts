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

    // Paramètres de recherche et filtres
    const search = searchParams.get("search") || ""
    const designer = searchParams.get("designer") || ""
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")

    // Paramètres de tri
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    // Construction du filtre MongoDB
    const filter: any = {}

    // Filtre de recherche textuelle
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
        { materiaux: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }

    // Filtre par designer
    if (designer) {
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { designer: { $regex: designer, $options: "i" } },
          { "Artiste / Dates": { $regex: designer, $options: "i" } },
        ],
      })
    }

    // Filtre par plage d'années
    if (yearMin || yearMax) {
      const yearFilter: any = {}
      if (yearMin) yearFilter.$gte = Number.parseInt(yearMin)
      if (yearMax) yearFilter.$lte = Number.parseInt(yearMax)

      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { annee: yearFilter },
          { year: yearFilter },
          {
            $expr: {
              $and: [
                {
                  $gte: [
                    {
                      $toInt: {
                        $arrayElemAt: [
                          {
                            $regexFindAll: {
                              input: { $ifNull: ["$Artiste / Dates", ""] },
                              regex: "\\b(1[0-9]{3}|20[0-9]{2})\\b",
                            },
                          },
                          0,
                        ],
                      },
                    },
                    yearMin ? Number.parseInt(yearMin) : 0,
                  ],
                },
                {
                  $lte: [
                    {
                      $toInt: {
                        $arrayElemAt: [
                          {
                            $regexFindAll: {
                              input: { $ifNull: ["$Artiste / Dates", ""] },
                              regex: "\\b(1[0-9]{3}|20[0-9]{2})\\b",
                            },
                          },
                          0,
                        ],
                      },
                    },
                    yearMax ? Number.parseInt(yearMax) : 3000,
                  ],
                },
              ],
            },
          },
        ],
      })
    }

    // Construction de l'objet de tri
    const sort: any = {}

    // Mapping des champs de tri
    const sortFieldMap: { [key: string]: string } = {
      nom: "nom",
      designer: "designer",
      annee: "annee",
    }

    const actualSortField = sortFieldMap[sortField] || "nom"
    sort[actualSortField] = sortDirection === "desc" ? -1 : 1

    // Tri de fallback sur les champs alternatifs
    if (actualSortField === "nom") {
      sort["Nom luminaire"] = sortDirection === "desc" ? -1 : 1
    } else if (actualSortField === "designer") {
      sort["Artiste / Dates"] = sortDirection === "desc" ? -1 : 1
    } else if (actualSortField === "annee") {
      sort["year"] = sortDirection === "desc" ? -1 : 1
    }

    // CORRECTION: Ajouter _id comme critère de tri stable pour éviter les doublons
    sort._id = 1

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter, null, 2))
    console.log("📊 Tri MongoDB:", JSON.stringify(sort, null, 2))

    // Compter le total d'éléments
    const total = await db.collection("luminaires").countDocuments(filter)

    // Récupérer les luminaires avec pagination
    const luminaires = await db.collection("luminaires").find(filter).sort(sort).skip(skip).limit(limit).toArray()

    console.log(`✅ ${luminaires.length} luminaires trouvés (page ${page}/${Math.ceil(total / limit)})`)

    return NextResponse.json({
      success: true,
      luminaires: luminaires.map((item) => ({
        ...item,
        _id: item._id.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("❌ Erreur API luminaires:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const luminaireData = await request.json()

    // Ajouter un timestamp de création
    const newLuminaire = {
      ...luminaireData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("luminaires").insertOne(newLuminaire)

    return NextResponse.json({
      success: true,
      luminaire: {
        ...newLuminaire,
        _id: result.insertedId.toString(),
      },
    })
  } catch (error) {
    console.error("❌ Erreur création luminaire:", error)
    return NextResponse.json({ success: false, error: "Erreur lors de la création" }, { status: 500 })
  }
}
