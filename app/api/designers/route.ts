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

    console.log(`📊 Paramètres designers: page=${page}, limit=${limit}, search="${search}"`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("designers")

    // Construire le filtre de recherche
    const filter: any = {}

    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { biographie: { $regex: search, $options: "i" } },
      ]
    }

    console.log("🔍 Filtre MongoDB designers:", JSON.stringify(filter))

    // Compter le total
    const total = await collection.countDocuments(filter)
    console.log(`📊 Total designers trouvés: ${total}`)

    // Récupérer les designers avec pagination
    const skip = (page - 1) * limit
    const designers = await collection.find(filter).sort({ nom: 1 }).skip(skip).limit(limit).toArray()

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
