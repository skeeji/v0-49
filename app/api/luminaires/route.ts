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
    const anneeMin = searchParams.get("anneeMin")
    const anneeMax = searchParams.get("anneeMax")
    const sort = searchParams.get("sort") || "nom"
    const order = searchParams.get("order") || "asc"

    console.log(`📊 Paramètres: page=${page}, limit=${limit}, search="${search}", designer="${designer}"`)

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
        { periode: { $regex: search, $options: "i" } },
      ]
    }

    if (designer) {
      filter.designer = { $regex: designer, $options: "i" }
    }

    if (periode) {
      filter.periode = { $regex: periode, $options: "i" }
    }

    if (anneeMin || anneeMax) {
      filter.annee = {}
      if (anneeMin) filter.annee.$gte = Number.parseInt(anneeMin)
      if (anneeMax) filter.annee.$lte = Number.parseInt(anneeMax)
    }

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter))

    // Compter le total
    const total = await collection.countDocuments(filter)
    console.log(`📊 Total trouvé: ${total} luminaires`)

    // Récupérer les luminaires avec pagination
    const skip = (page - 1) * limit
    const sortOrder = order === "desc" ? -1 : 1
    const sortObj: any = {}
    sortObj[sort] = sortOrder

    const luminaires = await collection.find(filter).sort(sortObj).skip(skip).limit(limit).toArray()

    console.log(`✅ Récupéré: ${luminaires.length} luminaires pour la page ${page}`)

    // Transformer les données pour le frontend
    const transformedLuminaires = luminaires.map((luminaire) => ({
      _id: luminaire._id.toString(),
      nom: luminaire.nom || "",
      designer: luminaire.designer || "",
      annee: luminaire.annee || new Date().getFullYear(),
      periode: luminaire.periode || "",
      description: luminaire.description || "",
      materiaux: luminaire.materiaux || [],
      couleurs: luminaire.couleurs || [],
      dimensions: luminaire.dimensions || "",
      images: luminaire.images || [],
      filename: luminaire["Nom du fichier"] || luminaire.filename || "",
      specialite: luminaire.specialite || "",
      collaboration: luminaire.collaboration || "",
      signe: luminaire.signe || "",
      estimation: luminaire.estimation || "",
      isFavorite: luminaire.isFavorite || false,
      createdAt: luminaire.createdAt,
      updatedAt: luminaire.updatedAt,
    }))

    const response = {
      success: true,
      luminaires: transformedLuminaires,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      filters: {
        search,
        designer,
        periode,
        anneeMin,
        anneeMax,
        sort,
        order,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur API luminaires:", error)
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
