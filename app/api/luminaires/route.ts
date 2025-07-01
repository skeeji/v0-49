import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API /api/luminaires - Récupération des luminaires")

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const designer = searchParams.get("designer") || ""
    const periode = searchParams.get("periode") || ""
    const materiaux = searchParams.get("materiaux") || ""
    const couleurs = searchParams.get("couleurs") || ""
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    console.log(
      `📊 Paramètres: page=${page}, limit=${limit}, search="${search}", yearMin=${yearMin}, yearMax=${yearMax}`,
    )

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Construire le filtre de recherche
    const filter: any = {}

    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
        { Spécialité: { $regex: search, $options: "i" } },
        { "Collaboration / Œuvre": { $regex: search, $options: "i" } },
      ]
    }

    if (designer) {
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { designer: { $regex: designer, $options: "i" } },
          { "Artiste / Dates": { $regex: designer, $options: "i" } },
        ],
      })
    }

    if (periode) {
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [{ periode: { $regex: periode, $options: "i" } }, { Spécialité: { $regex: periode, $options: "i" } }],
      })
    }

    if (materiaux) {
      filter.materiaux = { $in: [new RegExp(materiaux, "i")] }
    }

    if (couleurs) {
      filter.couleurs = { $in: [new RegExp(couleurs, "i")] }
    }

    // Filtre par années - ne pas filtrer si les valeurs par défaut sont utilisées
    if (yearMin && yearMax && !(yearMin === "1900" && yearMax === "2024")) {
      const yearConditions: any[] = []
      const minYear = Number.parseInt(yearMin)
      const maxYear = Number.parseInt(yearMax)

      yearConditions.push(
        { annee: { $gte: minYear, $lte: maxYear } },
        { year: { $gte: minYear, $lte: maxYear } },
        { Année: { $gte: yearMin, $lte: yearMax } },
      )

      filter.$and = filter.$and || []
      filter.$and.push({ $or: yearConditions })
    } else if (yearMin && yearMin !== "1900") {
      const minYear = Number.parseInt(yearMin)
      const yearConditions: any[] = []

      yearConditions.push({ annee: { $gte: minYear } }, { year: { $gte: minYear } }, { Année: { $gte: yearMin } })

      filter.$and = filter.$and || []
      filter.$and.push({ $or: yearConditions })
    } else if (yearMax && yearMax !== "2024") {
      const maxYear = Number.parseInt(yearMax)
      const yearConditions: any[] = []

      yearConditions.push({ annee: { $lte: maxYear } }, { year: { $lte: maxYear } }, { Année: { $lte: yearMax } })

      filter.$and = filter.$and || []
      filter.$and.push({ $or: yearConditions })
    }

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter, null, 2))

    // Construire le tri
    const sort: any = {}
    if (sortField === "annee") {
      sort.annee = sortDirection === "desc" ? -1 : 1
      sort.year = sortDirection === "desc" ? -1 : 1
      sort["Année"] = sortDirection === "desc" ? -1 : 1
    } else {
      sort[sortField] = sortDirection === "desc" ? -1 : 1
    }

    // Compter le total
    const total = await collection.countDocuments(filter)
    console.log(`📊 Total luminaires trouvés: ${total}`)

    // Récupérer les luminaires avec pagination
    const skip = (page - 1) * limit
    const luminaires = await collection.find(filter).sort(sort).skip(skip).limit(limit).toArray()

    console.log(`📊 ${luminaires.length} luminaires récupérés pour la page ${page}`)

    // Formater les luminaires pour l'affichage
    const formattedLuminaires = luminaires.map((luminaire) => ({
      _id: luminaire._id.toString(),
      id: luminaire._id.toString(),

      // Champs principaux avec fallback sur les champs CSV
      nom: luminaire.nom || luminaire["Nom luminaire"] || "",
      name: luminaire.nom || luminaire["Nom luminaire"] || "",
      designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
      artist: luminaire.designer || luminaire["Artiste / Dates"] || "",
      annee: luminaire.annee || (luminaire["Année"] ? Number.parseInt(luminaire["Année"]) : null),
      year: luminaire.annee || (luminaire["Année"] ? Number.parseInt(luminaire["Année"]) : null),
      periode: luminaire.periode || luminaire["Spécialité"] || "",
      specialty: luminaire.periode || luminaire["Spécialité"] || "",
      description: luminaire.description || luminaire["Collaboration / Œuvre"] || "",
      collaboration: luminaire.description || luminaire["Collaboration / Œuvre"] || "",
      signe: luminaire.signe || luminaire["Signé"] || "",
      signed: luminaire.signe || luminaire["Signé"] || "",
      filename: luminaire.filename || luminaire["Nom du fichier"] || "",

      // Image
      image: luminaire.images?.[0] ? `/api/images/filename/${luminaire.images[0]}` : null,

      // Autres champs
      materiaux: luminaire.materiaux || [],
      couleurs: luminaire.couleurs || [],
      dimensions: luminaire.dimensions || {},
      images: luminaire.images || [],
      isFavorite: luminaire.isFavorite || false,
      createdAt: luminaire.createdAt,
      updatedAt: luminaire.updatedAt,

      // Champs CSV originaux
      "Artiste / Dates": luminaire["Artiste / Dates"] || "",
      Spécialité: luminaire["Spécialité"] || "",
      "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"] || "",
      "Nom luminaire": luminaire["Nom luminaire"] || "",
      Année: luminaire["Année"] || "",
      Signé: luminaire["Signé"] || "",
      "Nom du fichier": luminaire["Nom du fichier"] || "",
    }))

    // Calculer les options de filtres
    const allLuminaires = await collection.find({}).limit(1000).toArray()
    const designers = [...new Set(allLuminaires.map((l) => l.designer || l["Artiste / Dates"]).filter(Boolean))].sort()
    const periodes = [...new Set(allLuminaires.map((l) => l.periode || l["Spécialité"]).filter(Boolean))].sort()
    const allMateriaux = [...new Set(allLuminaires.flatMap((l) => l.materiaux || []).filter(Boolean))].sort()
    const allCouleurs = [...new Set(allLuminaires.flatMap((l) => l.couleurs || []).filter(Boolean))].sort()

    const response = {
      success: true,
      luminaires: formattedLuminaires,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      filters: {
        designers,
        periodes,
        materiaux: allMateriaux,
        couleurs: allCouleurs,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires:", error)
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
    console.log("📥 API /api/luminaires POST - Création d'un luminaire")

    const data = await request.json()
    console.log("📊 Données reçues:", data)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaire = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(luminaire)
    console.log("✅ Luminaire créé avec l'ID:", result.insertedId)

    return NextResponse.json({
      success: true,
      message: "Luminaire créé avec succès",
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
