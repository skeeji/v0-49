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
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    console.log(`📊 Paramètres: page=${page}, limit=${limit}, search="${search}"`)

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

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter))

    // Construire le tri
    const sort: any = {}
    sort[sortField] = sortDirection === "desc" ? -1 : 1

    // Compter le total
    const total = await collection.countDocuments(filter)
    console.log(`📊 Total luminaires trouvés: ${total}`)

    // Récupérer les luminaires avec pagination
    const skip = (page - 1) * limit
    const luminaires = await collection.find(filter).sort(sort).skip(skip).limit(limit).toArray()

    console.log(`📊 ${luminaires.length} luminaires récupérés pour la page ${page}`)

    // Formater les luminaires pour l'affichage
    const formattedLuminaires = luminaires.map((luminaire) => ({
      ...luminaire,
      id: luminaire._id.toString(),
      image: luminaire.images?.[0] ? `/api/images/filename/${luminaire.images[0]}` : null,
      artist: luminaire.designer || luminaire["Artiste / Dates"],
      year: luminaire.annee || luminaire["Année"],
      name: luminaire.nom || luminaire["Nom luminaire"],
    }))

    // Calculer les options de filtres
    const allLuminaires = await collection.find({}).toArray()
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
