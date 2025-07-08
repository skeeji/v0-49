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
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    console.log(
      `📊 Paramètres: page=${page}, limit=${limit}, search="${search}", yearMin=${yearMin}, yearMax=${yearMax}, sortField=${sortField}`,
    )

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
        { collaboration: { $regex: search, $options: "i" } },
      ]
    }

    if (designer) {
      filter.$and = filter.$and || []
      filter.$and.push({
        designer: { $regex: designer, $options: "i" },
      })
    }

    if (periode) {
      filter.$and = filter.$and || []
      filter.$and.push({
        periode: { $regex: periode, $options: "i" },
      })
    }

    if (materiaux) {
      filter.materiaux = { $in: [new RegExp(materiaux, "i")] }
    }

    if (couleurs) {
      filter.couleurs = { $in: [new RegExp(couleurs, "i")] }
    }

    // Filtre par années
    if (yearMin && yearMax) {
      const minYear = Number.parseInt(yearMin)
      const maxYear = Number.parseInt(yearMax)

      if (minYear !== 1900 || maxYear !== 2024) {
        console.log(`🎯 Application du filtre d'années: ${minYear} - ${maxYear}`)

        const yearConditions: any[] = []
        yearConditions.push({ annee: { $gte: minYear, $lte: maxYear } })

        const yearRegexPattern = []
        for (let year = minYear; year <= maxYear; year++) {
          yearRegexPattern.push(year.toString())
        }

        if (yearRegexPattern.length > 0) {
          const yearRegex = new RegExp(`\\b(${yearRegexPattern.join("|")})\\b`)
          yearConditions.push({ annee: { $regex: yearRegex } })
        }

        filter.$and = filter.$and || []
        filter.$and.push({ $or: yearConditions })
      } else {
        console.log("📅 Valeurs par défaut détectées, pas de filtre d'années appliqué")
      }
    }

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter, null, 2))

    // Construire le tri
    const sort: any = {}
    let sortFilter = filter

    if (sortField === "annee") {
      sortFilter = {
        ...filter,
        $and: [
          ...(filter.$and || []),
          {
            annee: { $exists: true, $ne: null, $ne: "" },
          },
        ],
      }
      sort.annee = sortDirection === "desc" ? -1 : 1
    } else {
      if (sortField === "nom") {
        sort.nom = sortDirection === "desc" ? -1 : 1
      } else if (sortField === "designer") {
        sort.designer = sortDirection === "desc" ? -1 : 1
      } else {
        sort[sortField] = sortDirection === "desc" ? -1 : 1
      }
    }

    // Compter le total avec le bon filtre
    const total = await collection.countDocuments(sortFilter)
    console.log(`📊 Total luminaires trouvés: ${total}`)

    // Récupérer les luminaires avec pagination
    const skip = (page - 1) * limit
    const luminaires = await collection.find(sortFilter).sort(sort).skip(skip).limit(limit).toArray()

    console.log(`📊 ${luminaires.length} luminaires récupérés pour la page ${page}`)

    // Lecture directe des champs standardisés
    const formattedLuminaires = luminaires.map((luminaire) => ({
      _id: luminaire._id.toString(),
      id: luminaire._id.toString(),

      // Lecture directe des champs standardisés
      nom: luminaire.nom || "",
      designer: luminaire.designer || "",
      annee: luminaire.annee || null,
      periode: luminaire.periode || "", // Sera utilisé pour la "Spécialité"
      description: luminaire.description || "",
      collaboration: luminaire.collaboration || "", // Sera utilisé pour "Collaboration"
      signe: luminaire.signe || "",
      editeur: luminaire.editeur || "",
      dimensions: luminaire.dimensions || "",
      estimation: luminaire.estimation || "",

      // Champs de type tableau
      materiaux: luminaire.materiaux || [],
      couleurs: luminaire.couleurs || [],
      images: luminaire.images || [],

      // Champs liés aux images
      image: luminaire.images?.[0] ? `/api/images/filename/${luminaire.images[0]}` : null,
      designerImage: luminaire.designerImageFilename ? `/api/images/filename/${luminaire.designerImageFilename}` : null,
      designerImageFilename: luminaire.designerImageFilename || "",

      // Champs techniques
      isFavorite: luminaire.isFavorite || false,
      createdAt: luminaire.createdAt,
      updatedAt: luminaire.updatedAt,
    }))

    // Calculer les options de filtres
    const allLuminaires = await collection.find({}).limit(1000).toArray()
    const designers = [...new Set(allLuminaires.map((l) => l.designer).filter(Boolean))].sort()
    const periodes = [...new Set(allLuminaires.map((l) => l.periode).filter(Boolean))].sort()
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID manquant" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.deleteOne({ _id: new (require("mongodb").ObjectId)(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Luminaire supprimé avec succès" })
  } catch (error: any) {
    console.error("❌ Erreur suppression luminaire:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la suppression du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
