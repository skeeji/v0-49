import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)

    // Paramètres de pagination
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // Paramètres de filtrage
    const search = searchParams.get("search")?.trim()
    const designer = searchParams.get("designer")?.trim()
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") === "desc" ? -1 : 1

    // Si on demande juste les stats
    const statsOnly = searchParams.get("stats") === "true"

    if (statsOnly) {
      console.log("📊 Calcul des statistiques globales...")

      // Calculer les bornes d'années
      const yearStats = await db
        .collection("luminaires")
        .aggregate([
          {
            $group: {
              _id: null,
              minYear: { $min: { $ifNull: ["$annee", "$year"] } },
              maxYear: { $max: { $ifNull: ["$annee", "$year"] } },
              total: { $sum: 1 },
            },
          },
        ])
        .toArray()

      const yearBounds = yearStats[0]
        ? {
            min: yearStats[0].minYear || 1900,
            max: yearStats[0].maxYear || 2024,
          }
        : { min: 1900, max: 2024 }

      console.log(`📊 Stats: ${yearBounds.min}-${yearBounds.max}, total: ${yearStats[0]?.total || 0}`)

      return NextResponse.json({
        success: true,
        yearBounds,
        total: yearStats[0]?.total || 0,
      })
    }

    // Construction du filtre MongoDB
    const filter: any = {}

    // Filtre de recherche textuelle
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { specialite: { $regex: search, $options: "i" } },
        { collaboration: { $regex: search, $options: "i" } },
        { materiaux: { $regex: search, $options: "i" } },
      ]
    }

    // Filtre par designer
    if (designer) {
      filter.designer = { $regex: `^${designer}$`, $options: "i" }
    }

    // Filtre par années
    if (yearMin || yearMax) {
      const yearFilter: any = {}
      if (yearMin) {
        yearFilter.$gte = Number.parseInt(yearMin)
      }
      if (yearMax) {
        yearFilter.$lte = Number.parseInt(yearMax)
      }

      filter.$or = [{ annee: yearFilter }, { year: yearFilter }]
    }

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter, null, 2))

    // Construction du tri
    const sortOptions: any = {}
    if (sortField === "annee") {
      sortOptions.annee = sortDirection
      sortOptions.year = sortDirection // Fallback
    } else {
      sortOptions[sortField] = sortDirection
    }

    console.log("📊 Tri:", sortOptions)

    // Compter le total avec filtres
    const total = await db.collection("luminaires").countDocuments(filter)
    console.log(`📊 Total avec filtres: ${total}`)

    // Récupérer les luminaires avec pagination
    const luminaires = await db
      .collection("luminaires")
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray()

    console.log(`📊 Luminaires récupérés: ${luminaires.length}`)

    // Calculer la pagination
    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    return NextResponse.json({
      success: true,
      luminaires: luminaires.map((item) => ({
        ...item,
        _id: item._id.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasMore,
      },
    })
  } catch (error) {
    console.error("❌ Erreur API luminaires:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const data = await request.json()

    // Validation des données
    if (!data.nom) {
      return NextResponse.json({ success: false, error: "Le nom est requis" }, { status: 400 })
    }

    // Ajouter les métadonnées
    const luminaire = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("luminaires").insertOne(luminaire)

    return NextResponse.json({
      success: true,
      luminaire: {
        ...luminaire,
        _id: result.insertedId.toString(),
      },
    })
  } catch (error) {
    console.error("❌ Erreur création luminaire:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
