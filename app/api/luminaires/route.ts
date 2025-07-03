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
        { collaboration: { $regex: search, $options: "i" } },
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
        { Spécialité: { $regex: search, $options: "i" } },
        { "Collaboration / Œuvre": { $regex: search, $options: "i" } },
      ]
    }

    if (designer) {
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { designer: { $regex: designer, $options: "i" } },
          { "Artiste / Dates": { $regex: designer, $options: "i" } },
        ],
      })
    }

    if (periode) {
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [{ periode: { $regex: periode, $options: "i" } }, { Spécialité: { $regex: periode, $options: "i" } }],
      })
    }

    if (materiaux) {
      filter.materiaux = { $in: [new RegExp(materiaux, "i")] }
    }

    if (couleurs) {
      filter.couleurs = { $in: [new RegExp(couleurs, "i")] }
    }

    // CORRECTION: Filtre par années - SEULEMENT si yearMin et yearMax sont fournis ET différents des bornes réelles
    if (yearMin && yearMax) {
      const minYear = Number.parseInt(yearMin)
      const maxYear = Number.parseInt(yearMax)

      // CORRECTION: Ne pas appliquer le filtre si ce sont les valeurs par défaut OU les bornes complètes
      // On vérifie que ce ne sont pas les valeurs 1900-2024 ET pas les bornes réelles de la base
      const isDefaultRange = minYear === 1900 && maxYear === 2024
      const isFullRange = minYear <= 1165 && maxYear >= 2026 // Bornes approximatives de la base

      if (!isDefaultRange && !isFullRange) {
        console.log(`🎯 Application du filtre d'années: ${minYear} - ${maxYear}`)

        const yearConditions: any[] = []

        // Filtre sur les champs numériques
        yearConditions.push({ annee: { $gte: minYear, $lte: maxYear } }, { year: { $gte: minYear, $lte: maxYear } })

        // Filtre sur le champ "Année" avec regex pour éviter l'erreur $toInt
        const yearRegexPattern = []
        for (let year = minYear; year <= maxYear; year++) {
          yearRegexPattern.push(year.toString())
        }

        if (yearRegexPattern.length > 0) {
          const yearRegex = new RegExp(`\\b(${yearRegexPattern.join("|")})\\b`)
          yearConditions.push({ Année: { $regex: yearRegex } })
        }

        filter.$and = filter.$and || []
        filter.$and.push({ $or: yearConditions })
      } else {
        console.log("📅 Plage complète détectée, pas de filtre d'années appliqué")
      }
    }

    console.log("🔍 Filtre MongoDB:", JSON.stringify(filter, null, 2))

    // Construire le tri
    const sort: any = {}
    let sortFilter = filter

    if (sortField === "annee") {
      // Pour le tri par année, exclure les luminaires sans année
      sortFilter = {
        ...filter,
        $and: [
          ...(filter.$and || []),
          {
            $or: [
              { annee: { $exists: true, $ne: null, $ne: "" } },
              { year: { $exists: true, $ne: null, $ne: "" } },
              { Année: { $exists: true, $ne: null, $ne: "" } },
            ],
          },
        ],
      }
      sort.annee = sortDirection === "desc" ? -1 : 1
      sort.year = sortDirection === "desc" ? -1 : 1
      sort["Année"] = sortDirection === "desc" ? -1 : 1
    } else {
      if (sortField === "nom") {
        sort.nom = sortDirection === "desc" ? -1 : 1
        sort["Nom luminaire"] = sortDirection === "desc" ? -1 : 1
      } else if (sortField === "designer") {
        sort.designer = sortDirection === "desc" ? -1 : 1
        sort["Artiste / Dates"] = sortDirection === "desc" ? -1 : 1
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

    // Formater les luminaires pour l'affichage
    const formattedLuminaires = luminaires.map((luminaire) => ({
      _id: luminaire._id.toString(),
      id: luminaire._id.toString(),

      // Champs principaux avec fallback sur les champs CSV
      nom: luminaire.nom || luminaire["Nom luminaire"] || "",
      name: luminaire.nom || luminaire["Nom luminaire"] || "",
      designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
      artist: luminaire.designer || luminaire["Artiste / Dates"] || "",
      annee: luminaire.annee || (luminaire["Année"] ? Number.parseInt(luminaire["Année"]) : null),
      year: luminaire.annee || (luminaire["Année"] ? Number.parseInt(luminaire["Année"]) : null),
      periode: luminaire.periode || luminaire["Spécialité"] || "",
      specialty: luminaire.periode || luminaire["Spécialité"] || "",

      // CORRECTION: Champs complètement séparés
      description: luminaire.description || "", // Description PURE
      collaboration: luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "", // Collaboration PURE

      signe: luminaire.signe || luminaire["Signé"] || "",
      signed: luminaire.signe || luminaire["Signé"] || "",
      filename: luminaire.filename || luminaire["Nom du fichier"] || "",

      // Champs étendus
      editeur: luminaire.editeur || "",
      dimensions: luminaire.dimensions || "",
      estimation: luminaire.estimation || "",

      // Image principale du luminaire
      image: luminaire.images?.[0]
        ? `/api/images/filename/${luminaire.images[0]}`
        : luminaire.filename
          ? `/api/images/filename/${luminaire.filename}`
          : null,

      // Image du designer
      designerImage: luminaire.designerImageFilename ? `/api/images/filename/${luminaire.designerImageFilename}` : null,
      designerImageFilename: luminaire.designerImageFilename || "",

      // Autres champs
      materiaux: luminaire.materiaux || [],
      couleurs: luminaire.couleurs || [],
      images: luminaire.images || [],
      isFavorite: luminaire.isFavorite || false,
      createdAt: luminaire.createdAt,
      updatedAt: luminaire.updatedAt,

      // Champs CSV originaux
      "Artiste / Dates": luminaire["Artiste / Dates"] || "",
      Spécialité: luminaire["Spécialité"] || "",
      "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"] || "",
      "Nom luminaire": luminaire["Nom luminaire"] || "",
      Année: luminaire["Année"] || "",
      Signé: luminaire["Signé"] || "",
      "Nom du fichier": luminaire["Nom du fichier"] || "",
    }))

    // Calculer les options de filtres
    const allLuminaires = await collection.find({}).limit(1000).toArray()
    const designers = [...new Set(allLuminaires.map((l) => l.designer || l["Artiste / Dates"]).filter(Boolean))].sort()
    const periodes = [...new Set(allLuminaires.map((l) => l.periode || l["Spécialité"]).filter(Boolean))].sort()
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
