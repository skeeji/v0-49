import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const categorie = searchParams.get("categorie") || ""
    const materiau = searchParams.get("materiau") || ""
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    console.log("🔍 API /api/luminaires - Paramètres reçus:", {
      page,
      limit,
      search,
      categorie,
      materiau,
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

    // Filtre par catégorie
    if (categorie && categorie.trim() !== "") {
      const categorieFilter = {
        $or: [{ categorie: { $regex: categorie, $options: "i" } }, { Catégorie: { $regex: categorie, $options: "i" } }],
      }

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, categorieFilter]
        delete filter.$or
      } else {
        filter.$or = categorieFilter.$or
      }
    }

    // Filtre par matériau
    if (materiau && materiau.trim() !== "") {
      const materiauFilter = {
        $or: [{ materiaux: { $regex: materiau, $options: "i" } }, { Matériaux: { $regex: materiau, $options: "i" } }],
      }

      if (filter.$and) {
        filter.$and.push(materiauFilter)
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, materiauFilter]
        delete filter.$or
      } else {
        Object.assign(filter, materiauFilter)
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
    const formattedLuminaires = luminaires.map((luminaire) => {
      // CORRECTION: Gestion unifiée des matériaux
      let materiauxFormatted = []
      if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
        materiauxFormatted = luminaire.materiaux
      } else if (luminaire.Matériaux) {
        if (Array.isArray(luminaire.Matériaux)) {
          materiauxFormatted = luminaire.Matériaux
        } else if (typeof luminaire.Matériaux === "string") {
          materiauxFormatted = luminaire.Matériaux.split(/[,;]/)
            .map((m) => m.trim())
            .filter((m) => m)
        }
      }

      return {
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
        materiaux: materiauxFormatted,
        categorie: luminaire.categorie || luminaire["Catégorie"] || "",
        lienSiteMarchand: luminaire.lienSiteMarchand || luminaire["Lien site marchand"] || "",
        etiquette: luminaire.etiquette || luminaire["Etiquette"] || "",
        bibliographie: luminaire.bibliographie || luminaire["Bibliographie"] || "",
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
        "Nom luminaire": luminaire["Nom luminaire"] || luminaire.nom || "",
        "Artiste / Dates": luminaire["Artiste / Dates"] || luminaire.designer || "",
        Année: luminaire["Année"] || luminaire.annee || "",
        Spécialité: luminaire["Spécialité"] || luminaire.periode || "",
        "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"] || luminaire.collaboration || "",
        Signé: luminaire["Signé"] || luminaire.signe || "",
        "Nom du fichier": luminaire["Nom du fichier"] || luminaire.filename || "",
        Dimensions: luminaire["Dimensions"] || luminaire.dimensions || "",
        Estimation: luminaire["Estimation"] || luminaire.estimation || "",
        Matériaux: Array.isArray(materiauxFormatted) ? materiauxFormatted.join(", ") : materiauxFormatted,
        Catégorie: luminaire["Catégorie"] || luminaire.categorie || "",
        "Lien site marchand": luminaire["Lien site marchand"] || luminaire.lienSiteMarchand || "",
        Etiquette: luminaire["Etiquette"] || luminaire.etiquette || "",
        Bibliographie: luminaire["Bibliographie"] || luminaire.bibliographie || "",
      }
    })

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

    // CORRECTION: Ajouter aussi les champs CSV pour compatibilité
    const newLuminaire = {
      ...luminaireData,
      // Ajouter les champs CSV pour assurer la compatibilité
      "Nom luminaire": luminaireData.nom || "",
      "Artiste / Dates": luminaireData.designer || "",
      Année: luminaireData.annee || "",
      Spécialité: luminaireData.periode || "",
      "Collaboration / Œuvre": luminaireData.collaboration || "",
      Signé: luminaireData.signe || "",
      "Nom du fichier": luminaireData.filename || "",
      Dimensions: luminaireData.dimensions || "",
      Estimation: luminaireData.estimation || "",
      Matériaux: Array.isArray(luminaireData.materiaux)
        ? luminaireData.materiaux.join(", ")
        : luminaireData.materiaux || "",
      Catégorie: luminaireData.categorie || "",
      "Lien site marchand": luminaireData.lienSiteMarchand || "",
      Etiquette: luminaireData.etiquette || "",
      Bibliographie: luminaireData.bibliographie || "",
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
