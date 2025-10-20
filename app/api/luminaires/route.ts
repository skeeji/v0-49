import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = Number.parseInt(searchParams.get("skip") || "0")
    const search = searchParams.get("search") || ""
    const designer = searchParams.get("designer") || ""
    const periode = searchParams.get("periode") || ""
    const categorie = searchParams.get("categorie") || ""
    const sort = searchParams.get("sort") || "nom"
    const order = searchParams.get("order") || "asc"

    console.log(`📊 API /api/luminaires - limit: ${limit}, skip: ${skip}`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Construire le filtre
    const filter: any = {}

    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
      ]
    }

    if (designer) {
      filter.$or = [
        { designer: { $regex: designer, $options: "i" } },
        { "Artiste / Dates": { $regex: designer, $options: "i" } },
      ]
    }

    if (periode) {
      filter.$or = [{ periode: { $regex: periode, $options: "i" } }, { Spécialité: { $regex: periode, $options: "i" } }]
    }

    if (categorie) {
      filter.$or = [
        { categorie: { $regex: categorie, $options: "i" } },
        { Catégorie: { $regex: categorie, $options: "i" } },
      ]
    }

    // Construire le tri
    const sortField = sort === "annee" ? "annee" : sort === "designer" ? "designer" : "nom"
    const sortOrder = order === "desc" ? -1 : 1
    const sortQuery: any = { [sortField]: sortOrder }

    // Récupérer les luminaires
    const luminaires = await collection.find(filter).sort(sortQuery).skip(skip).limit(limit).toArray()

    const total = await collection.countDocuments(filter)

    console.log(`✅ ${luminaires.length} luminaires récupérés sur ${total} au total`)

    // Debug: afficher les noms de fichiers
    luminaires.forEach((lum: any) => {
      const filename = lum.filename || lum["Nom du fichier"] || "AUCUN"
      console.log(`Luminaire: ${lum.nom || lum["Nom luminaire"]} -> filename: ${filename}`)
    })

    return NextResponse.json({
      success: true,
      luminaires,
      total,
      limit,
      skip,
    })
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
    const body = await request.json()
    console.log("📝 API /api/luminaires POST - Création d'un luminaire")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaire = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(luminaire)

    console.log(`✅ Luminaire créé avec l'ID: ${result.insertedId}`)

    return NextResponse.json({
      success: true,
      id: result.insertedId,
      luminaire,
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires POST:", error)
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
