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

    console.log(`📊 Paramètres: page=${page}, limit=${limit}, search="${search}"`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("designers")

    // Construire le filtre de recherche
    const filter: any = {}

    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { biographie: { $regex: search, $options: "i" } },
        { nationalite: { $regex: search, $options: "i" } },
      ]
    }

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter))

    // Compter le total
    const total = await collection.countDocuments(filter)
    console.log(`📊 Total trouvé: ${total} designers`)

    // Récupérer les designers avec pagination
    const skip = (page - 1) * limit

    const designers = await collection.find(filter).sort({ nom: 1 }).skip(skip).limit(limit).toArray()

    console.log(`✅ Récupéré: ${designers.length} designers pour la page ${page}`)

    // Transformer les données pour le frontend
    const transformedDesigners = designers.map((designer) => ({
      _id: designer._id.toString(),
      nom: designer.nom || "",
      biographie: designer.biographie || "",
      dateNaissance: designer.dateNaissance || "",
      dateDeces: designer.dateDeces || "",
      nationalite: designer.nationalite || "",
      imagedesigner: designer.imagedesigner || "",
      createdAt: designer.createdAt,
      updatedAt: designer.updatedAt,
    }))

    const response = {
      success: true,
      designers: transformedDesigners,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur API designers:", error)
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
