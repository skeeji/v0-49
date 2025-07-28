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
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    // Construction du filtre MongoDB
    const filter: any = {}

    // Filtre de recherche textuelle
    if (search) {
      filter.$or = [
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { nom: { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { materiaux: { $regex: search, $options: "i" } },
      ]
    }

    // Filtre par designer
    if (designer) {
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { "Artiste / Dates": { $regex: designer, $options: "i" } },
          { designer: { $regex: designer, $options: "i" } },
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
                { $ne: [{ $type: "$annee" }, "missing"] },
                {
                  $and: [
                    yearMin ? { $gte: [{ $toInt: "$annee" }, Number.parseInt(yearMin)] } : {},
                    yearMax ? { $lte: [{ $toInt: "$annee" }, Number.parseInt(yearMax)] } : {},
                  ].filter(Boolean),
                },
              ],
            },
          },
        ],
      })
    }

    // Construction du tri
    const sort: any = {}

    // Mappage des champs de tri
    const sortFieldMap: { [key: string]: string } = {
      nom: "Nom luminaire",
      designer: "Artiste / Dates",
      annee: "annee",
    }

    const actualSortField = sortFieldMap[sortField] || sortField
    sort[actualSortField] = sortDirection === "desc" ? -1 : 1

    // CORRECTION: Ajouter _id comme critère de tri secondaire pour stabilité
    sort._id = 1

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter, null, 2))
    console.log("📊 Tri MongoDB:", JSON.stringify(sort, null, 2))

    // Exécution des requêtes
    const [luminaires, totalCount] = await Promise.all([
      db.collection("luminaires").find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      db.collection("luminaires").countDocuments(filter),
    ])

    console.log(`✅ ${luminaires.length} luminaires trouvés (page ${page}, total: ${totalCount})`)

    // Calcul de la pagination
    const totalPages = Math.ceil(totalCount / limit)
    const hasMore = page < totalPages

    return NextResponse.json({
      success: true,
      luminaires: luminaires.map((item) => ({
        ...item,
        _id: item._id.toString(),
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore,
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

    // Validation des données requises
    if (!luminaireData.nom && !luminaireData["Nom luminaire"]) {
      return NextResponse.json({ success: false, error: "Le nom du luminaire est requis" }, { status: 400 })
    }

    // Ajouter les métadonnées
    const newLuminaire = {
      ...luminaireData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("luminaires").insertOne(newLuminaire)

    console.log("✅ Nouveau luminaire créé:", result.insertedId)

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
