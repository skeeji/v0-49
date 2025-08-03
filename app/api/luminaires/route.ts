import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const designer = searchParams.get("designer") || ""
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    console.log("🔍 API /api/luminaires - Paramètres reçus:", {
      page,
      limit,
      search,
      designer,
      yearMin,
      yearMax,
      sortField,
      sortDirection,
    })

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Construction du filtre
    const filter: any = {}

    // Filtre de recherche textuelle
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
        { periode: { $regex: search, $options: "i" } },
        { Spécialité: { $regex: search, $options: "i" } },
      ]
    }

    // Filtre par designer - CORRECTION: ne pas filtrer si designer est vide
    if (designer && designer.trim() !== "") {
      const designerFilter = {
        $or: [
          { designer: { $regex: designer, $options: "i" } },
          { "Artiste / Dates": { $regex: designer, $options: "i" } },
        ],
      }

      if (filter.$or) {
        // Si on a déjà un filtre de recherche, on combine avec $and
        filter.$and = [{ $or: filter.$or }, designerFilter]
        delete filter.$or
      } else {
        // Sinon on applique directement le filtre designer
        filter.$or = designerFilter.$or
      }
    }

    // Filtre par année
    if (yearMin && yearMax) {
      const yearFilter = {
        $or: [
          {
            annee: {
              $gte: Number.parseInt(yearMin),
              $lte: Number.parseInt(yearMax),
            },
          },
          {
            Année: {
              $gte: yearMin,
              $lte: yearMax,
            },
          },
        ],
      }

      if (filter.$and) {
        filter.$and.push(yearFilter)
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, yearFilter]
        delete filter.$or
      } else {
        Object.assign(filter, yearFilter)
      }
    }

    console.log("🔍 Filtre MongoDB construit:", JSON.stringify(filter, null, 2))

    // Construction du tri
    const sortOptions: any = {}
    let sortKey = sortField

    // Mapping des champs de tri
    if (sortField === "nom") {
      sortKey = "nom"
    } else if (sortField === "designer") {
      sortKey = "designer"
    } else if (sortField === "annee") {
      sortKey = "annee"
    }

    sortOptions[sortKey] = sortDirection === "desc" ? -1 : 1

    // Calcul de la pagination
    const skip = (page - 1) * limit

    // Exécution de la requête
    const [luminaires, total] = await Promise.all([
      collection.find(filter).sort(sortOptions).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ])

    console.log(`✅ Trouvé ${luminaires.length} luminaires sur ${total} total`)

    // Formatage des résultats
    const formattedLuminaires = luminaires.map((luminaire) => ({
      _id: luminaire._id.toString(),
      nom: luminaire.nom || luminaire["Nom luminaire"] || "",
      designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
      annee: luminaire.annee || (luminaire["Année"] ? Number.parseInt(luminaire["Année"]) : null),
      periode: luminaire.periode || luminaire["Spécialité"] || "",
      signe: luminaire.signe || luminaire["Signé"] || "",
      description: luminaire.description || "",
      collaboration: luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
      dimensions: luminaire.dimensions || luminaire["Dimensions"] || "",
      estimation: luminaire.estimation || luminaire["Estimation"] || "",
      editeur: luminaire.editeur || "",
      materiaux: luminaire.materiaux || [],
      filename: luminaire.filename || luminaire["Nom du fichier"] || "",
      image: luminaire.images?.[0]
        ? `/api/images/filename/${luminaire.images[0]}`
        : luminaire.filename
          ? `/api/images/filename/${luminaire.filename}`
          : null,
      designerImageFilename: luminaire.designerImageFilename || "",
      images: luminaire.images || [],
      couleurs: luminaire.couleurs || [],
      createdAt: luminaire.createdAt,
      updatedAt: luminaire.updatedAt,
      "Nom luminaire": luminaire["Nom luminaire"] || "",
      "Artiste / Dates": luminaire["Artiste / Dates"] || "",
      Année: luminaire["Année"] || "",
      Spécialité: luminaire["Spécialité"] || "",
      "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"] || "",
      Signé: luminaire["Signé"] || "",
      "Nom du fichier": luminaire["Nom du fichier"] || "",
      Dimensions: luminaire["Dimensions"] || "",
      Estimation: luminaire["Estimation"] || "",
      Matériaux: luminaire["Matériaux"] || "",
    }))

    return NextResponse.json({
      success: true,
      luminaires: formattedLuminaires,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
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
    console.log("📝 API /api/luminaires POST - Création d'un nouveau luminaire")

    const luminaireData = await request.json()
    console.log("📊 Données reçues:", luminaireData)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Préparer les données pour l'insertion
    const newLuminaire = {
      ...luminaireData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(newLuminaire)

    console.log("✅ Luminaire créé avec l'ID:", result.insertedId)

    return NextResponse.json({
      success: true,
      message: "Luminaire créé avec succès",
      id: result.insertedId.toString(),
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
