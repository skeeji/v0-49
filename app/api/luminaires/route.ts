import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// FONCTION GET : Pour RÉCUPÉRER les luminaires (avec recherche et pagination)
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API /api/luminaires GET - Début")

    const client = await clientPromise
    const db = client.db()

    console.log("✅ Connexion MongoDB établie")

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const designer = searchParams.get("designer")
    const anneeMin = searchParams.get("anneeMin")
    const anneeMax = searchParams.get("anneeMax")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    // Construction de la requête MongoDB
    const query: any = {}

    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { specialite: { $regex: search, $options: "i" } },
      ]
    }

    if (designer && designer !== "all") {
      query.designer = { $regex: designer, $options: "i" }
    }

    if (anneeMin || anneeMax) {
      query.annee = {}
      if (anneeMin) query.annee.$gte = Number.parseInt(anneeMin)
      if (anneeMax) query.annee.$lte = Number.parseInt(anneeMax)
    }

    console.log("🔍 Requête MongoDB:", JSON.stringify(query, null, 2))

    // Construction du tri
    const sortOptions: any = {}
    const sortFieldMap: any = {
      nom: "nom",
      name: "nom",
      year: "annee",
      annee: "annee",
      designer: "designer",
    }

    const mappedSortField = sortFieldMap[sortField] || "nom"
    sortOptions[mappedSortField] = sortDirection === "desc" ? -1 : 1

    // Compter le total
    const totalCount = await db.collection("luminaires").countDocuments(query)
    console.log("📊 Nombre total de luminaires:", totalCount)

    // Calculer la pagination
    const skip = (page - 1) * limit
    const totalPages = Math.ceil(totalCount / limit)

    // Récupérer les luminaires
    const luminaires = await db.collection("luminaires").find(query).sort(sortOptions).skip(skip).limit(limit).toArray()

    console.log("✅ Luminaires récupérés:", luminaires.length)

    const response = {
      success: true,
      luminaires: luminaires,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erreur API /api/luminaires GET:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

// FONCTION POST : Pour AJOUTER un luminaire
export async function POST(request: NextRequest) {
  try {
    console.log("➕ API /api/luminaires POST - Début")

    const client = await clientPromise
    const db = client.db()
    const body = await request.json()

    console.log("📝 Données reçues:", body)

    if (!body.filename) {
      return NextResponse.json(
        { success: false, error: "Le nom de fichier est requis pour la liaison d'image" },
        { status: 400 },
      )
    }

    const result = await db.collection("luminaires").insertOne(body)
    console.log("✅ Luminaire inséré:", result.insertedId)

    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error("❌ Erreur API /api/luminaires POST:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
