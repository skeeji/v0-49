import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const search = searchParams.get("search") || ""
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"
    const designer = searchParams.get("designer") || ""
    const periode = searchParams.get("periode") || ""
    const materiaux = searchParams.get("materiaux") || ""
    const couleurs = searchParams.get("couleurs") || ""

    console.log(`🔍 Chargement page ${page} avec filtres:`, {
      sortField,
      sortDirection,
      page: page.toString(),
      limit: limit.toString(),
    })

    // Connexion à MongoDB
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Construction du filtre MongoDB
    const filter: any = {}

    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }

    if (designer) {
      filter.designer = { $regex: designer, $options: "i" }
    }

    if (periode) {
      filter.periode = { $regex: periode, $options: "i" }
    }

    if (materiaux) {
      filter.materiaux = { $elemMatch: { $regex: materiaux, $options: "i" } }
    }

    if (couleurs) {
      filter.couleurs = { $elemMatch: { $regex: couleurs, $options: "i" } }
    }

    // Tri MongoDB
    const sortOptions: any = {}
    sortOptions[sortField] = sortDirection === "desc" ? -1 : 1

    // Compter le total
    const total = await collection.countDocuments(filter)

    // Pagination
    const skip = (page - 1) * limit

    // Récupération des données
    const luminaires = await collection.find(filter).sort(sortOptions).skip(skip).limit(limit).toArray()

    console.log(`📊 ${luminaires.length} luminaires chargés depuis MongoDB (page ${page})`)
    console.log(`📊 Total dans la base: ${total}`)

    return NextResponse.json({
      success: true,
      luminaires,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/luminaires:", error)
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

export async function POST(request: NextRequest) {
  try {
    console.log("📝 Création d'un nouveau luminaire")
    const body = await request.json()
    console.log("📥 Données reçues:", JSON.stringify(body, null, 2))

    // Connexion à MongoDB
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Préparer les données du luminaire
    const luminaireData = {
      nom: body.nom || "",
      designer: body.designer || "",
      annee: Number.parseInt(body.annee) || new Date().getFullYear(),
      periode: body.periode || "",
      description: body.description || "",
      materiaux: Array.isArray(body.materiaux) ? body.materiaux : [],
      couleurs: Array.isArray(body.couleurs) ? body.couleurs : [],
      dimensions: body.dimensions || {},
      images: Array.isArray(body.images) ? body.images : [],
      "Nom du fichier": body["Nom du fichier"] || body.filename || "",
      specialite: body.specialite || "",
      collaboration: body.collaboration || "",
      signe: body.signe || "",
      estimation: body.estimation || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Insérer dans MongoDB
    const result = await collection.insertOne(luminaireData)

    console.log(`✅ Nouveau luminaire créé avec l'ID: ${result.insertedId}`)

    return NextResponse.json({
      success: true,
      message: "Luminaire créé avec succès",
      id: result.insertedId.toString(),
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/luminaires:", error)
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
