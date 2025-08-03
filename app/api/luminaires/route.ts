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
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")

    // Construction du filtre MongoDB
    const filter: any = {}

    // Filtre de recherche textuelle
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
      ]
    }

    // Filtre par designer - CORRECTION: chercher dans les deux champs
    if (designer) {
      filter.$or = [
        ...(filter.$or || []),
        { designer: { $regex: `^${designer}$`, $options: "i" } },
        { "Artiste / Dates": { $regex: `^${designer}$`, $options: "i" } },
      ]
    }

    // Filtre par plage d'années
    if (yearMin && yearMax) {
      const minYear = Number.parseInt(yearMin)
      const maxYear = Number.parseInt(yearMax)

      if (!isNaN(minYear) && !isNaN(maxYear)) {
        filter.$or = [
          ...(filter.$or || []),
          {
            $expr: {
              $and: [
                { $gte: [{ $toInt: { $ifNull: ["$annee", "0"] } }, minYear] },
                { $lte: [{ $toInt: { $ifNull: ["$annee", "0"] } }, maxYear] },
              ],
            },
          },
          {
            $expr: {
              $and: [
                { $gte: [{ $toInt: { $ifNull: ["$Année", "0"] } }, minYear] },
                { $lte: [{ $toInt: { $ifNull: ["$Année", "0"] } }, maxYear] },
              ],
            },
          },
        ]
      }
    }

    // Construction du tri
    const sortOptions: any = {}
    const sortKey =
      sortField === "designer"
        ? "Artiste / Dates"
        : sortField === "annee"
          ? "Année"
          : sortField === "nom"
            ? "Nom luminaire"
            : sortField
    sortOptions[sortKey] = sortDirection === "desc" ? -1 : 1

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter, null, 2))
    console.log("📊 Options de tri:", sortOptions)

    // Exécution de la requête avec pagination
    const luminaires = await db
      .collection("luminaires")
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray()

    // Compter le total pour la pagination
    const total = await db.collection("luminaires").countDocuments(filter)

    console.log(`✅ ${luminaires.length} luminaires trouvés sur ${total} total`)

    return NextResponse.json({
      success: true,
      luminaires,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + luminaires.length < total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("❌ Erreur API luminaires:", error)
    return NextResponse.json({ success: false, error: "Erreur lors du chargement des luminaires" }, { status: 500 })
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
      luminaire: { ...newLuminaire, _id: result.insertedId },
    })
  } catch (error) {
    console.error("❌ Erreur création luminaire:", error)
    return NextResponse.json({ success: false, error: "Erreur lors de la création du luminaire" }, { status: 500 })
  }
}
