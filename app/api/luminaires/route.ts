import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API GET /api/luminaires appelée")

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") === "desc" ? -1 : 1
    const search = searchParams.get("search") || ""
    const designer = searchParams.get("designer") || ""
    const anneeMin = searchParams.get("anneeMin")
    const anneeMax = searchParams.get("anneeMax")

    console.log(`📊 Paramètres: page=${page}, limit=${limit}, sort=${sortField}:${sortDirection}, search="${search}"`)

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
        { specialite: { $regex: search, $options: "i" } },
      ]
    }

    if (designer && designer !== "all") {
      filter.designer = { $regex: designer, $options: "i" }
    }

    if (anneeMin || anneeMax) {
      filter.annee = {}
      if (anneeMin) filter.annee.$gte = Number.parseInt(anneeMin)
      if (anneeMax) filter.annee.$lte = Number.parseInt(anneeMax)
    }

    console.log("🔍 Filtre de recherche:", JSON.stringify(filter))

    // Compter le total
    const total = await collection.countDocuments(filter)
    console.log(`📊 Total de luminaires trouvés: ${total}`)

    // Récupérer les luminaires avec pagination
    const skip = (page - 1) * limit
    const luminaires = await collection
      .find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .toArray()

    console.log(`✅ ${luminaires.length} luminaires récupérés pour la page ${page}`)

    // Transformer les données pour le frontend
    const transformedLuminaires = luminaires.map((luminaire) => ({
      ...luminaire,
      _id: luminaire._id.toString(),
      images: luminaire.images || [],
      materiaux: luminaire.materiaux || [],
      couleurs: luminaire.couleurs || [],
      // CORRECTION: Convertir l'objet dimensions en string pour éviter l'erreur React #31
      dimensions:
        typeof luminaire.dimensions === "object" && luminaire.dimensions !== null
          ? `${luminaire.dimensions.hauteur || ""}x${luminaire.dimensions.largeur || ""}x${luminaire.dimensions.profondeur || ""}`.replace(
              /^x+|x+$/g,
              "",
            ) || ""
          : luminaire.dimensions || "",
      // CORRECTION: Utiliser le bon champ pour l'image (filename = 8ème colonne CSV)
      filename: luminaire.filename || "",
    }))

    const totalPages = Math.ceil(total / limit)
    const response = {
      success: true,
      luminaires: transformedLuminaires,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }

    console.log(`📤 Réponse envoyée: ${transformedLuminaires.length} luminaires, page ${page}/${totalPages}`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/luminaires:", error)
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
    console.log("➕ API POST /api/luminaires appelée")

    const body = await request.json()
    console.log("📥 Données reçues:", JSON.stringify(body, null, 2))

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Préparer les données du luminaire - CORRECTION: ne pas mettre 2025 par défaut
    const luminaire = {
      nom: body.nom || "",
      designer: body.designer || "",
      annee: body.annee ? Number.parseInt(body.annee) : null, // CORRECTION: laisser null si pas d'année
      periode: body.periode || "",
      description: body.description || "",
      materiaux: Array.isArray(body.materiaux) ? body.materiaux : [],
      couleurs: Array.isArray(body.couleurs) ? body.couleurs : [],
      dimensions: body.dimensions || {},
      images: Array.isArray(body.images) ? body.images : [],
      filename: body.filename || "",
      specialite: body.specialite || "",
      collaboration: body.collaboration || "",
      signe: body.signe || "",
      estimation: body.estimation || "",
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log("💾 Luminaire à insérer:", JSON.stringify(luminaire, null, 2))

    const result = await db.collection("luminaires").insertOne(luminaire)
    console.log(`✅ Luminaire inséré avec l'ID: ${result.insertedId}`)

    return NextResponse.json({
      success: true,
      message: "Luminaire créé avec succès",
      id: result.insertedId.toString(),
      luminaire: {
        ...luminaire,
        _id: result.insertedId.toString(),
      },
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
