import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API GET /api/designers appelée")

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
      filter.$or = [{ nom: { $regex: search, $options: "i" } }, { biographie: { $regex: search, $options: "i" } }]
    }

    console.log("🔍 Filtre de recherche:", JSON.stringify(filter))

    // Compter le total
    const total = await collection.countDocuments(filter)
    console.log(`📊 Total de designers trouvés: ${total}`)

    // Récupérer les designers avec pagination
    const skip = (page - 1) * limit
    const designers = await collection.find(filter).sort({ nom: 1 }).skip(skip).limit(limit).toArray()

    console.log(`✅ ${designers.length} designers récupérés pour la page ${page}`)

    // Transformer les données pour le frontend
    const transformedDesigners = designers.map((designer) => ({
      ...designer,
      _id: designer._id.toString(),
      images: designer.images || [],
      specialites: designer.specialites || [],
      periodes: designer.periodes || [],
    }))

    const response = {
      success: true,
      designers: transformedDesigners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }

    console.log(
      `📤 Réponse envoyée: ${transformedDesigners.length} designers, page ${page}/${Math.ceil(total / limit)}`,
    )
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("➕ API POST /api/designers appelée")

    const body = await request.json()
    console.log("📥 Données reçues:", JSON.stringify(body, null, 2))

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Préparer les données du designer
    const designer = {
      nom: body.nom || "",
      slug:
        body.slug ||
        body.nom
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      biographie: body.biographie || "",
      specialites: Array.isArray(body.specialites) ? body.specialites : [],
      periodes: Array.isArray(body.periodes) ? body.periodes : [],
      images: Array.isArray(body.images) ? body.images : [],
      imageFile: body.imageFile || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log("💾 Designer à insérer:", JSON.stringify(designer, null, 2))

    const result = await db.collection("designers").insertOne(designer)
    console.log(`✅ Designer inséré avec l'ID: ${result.insertedId}`)

    return NextResponse.json({
      success: true,
      message: "Designer créé avec succès",
      id: result.insertedId.toString(),
      designer: {
        ...designer,
        _id: result.insertedId.toString(),
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la création du designer",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
