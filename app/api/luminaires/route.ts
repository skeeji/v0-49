import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const designer = searchParams.get("designer") || ""
    const periode = searchParams.get("periode") || ""
    const materiaux = searchParams.get("materiaux") || ""
    const couleurs = searchParams.get("couleurs") || ""
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Construction du filtre
    const filter: any = {}

    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
      ]
    }

    if (designer) {
      filter.$or = [{ designer: designer }, { "Artiste / Dates": designer }]
    }

    if (periode) {
      filter.$or = [{ periode: periode }, { Spécialité: periode }]
    }

    if (materiaux) {
      filter.$or = [{ materiaux: { $in: [materiaux] } }, { Matériaux: { $regex: materiaux, $options: "i" } }]
    }

    if (couleurs) {
      filter.couleurs = { $in: [couleurs] }
    }

    if (yearMin && yearMax) {
      filter.$or = [
        { annee: { $gte: Number.parseInt(yearMin), $lte: Number.parseInt(yearMax) } },
        { year: { $gte: Number.parseInt(yearMin), $lte: Number.parseInt(yearMax) } },
        { Année: { $gte: yearMin, $lte: yearMax } },
      ]
    }

    // Construction du tri
    const sortOptions: any = {}
    if (sortField === "nom") {
      sortOptions["nom"] = sortDirection === "asc" ? 1 : -1
      sortOptions["Nom luminaire"] = sortDirection === "asc" ? 1 : -1
    } else if (sortField === "designer") {
      sortOptions["designer"] = sortDirection === "asc" ? 1 : -1
      sortOptions["Artiste / Dates"] = sortDirection === "asc" ? 1 : -1
    } else if (sortField === "annee") {
      sortOptions["annee"] = sortDirection === "asc" ? 1 : -1
      sortOptions["year"] = sortDirection === "asc" ? 1 : -1
    }

    // Compter le total
    const total = await collection.countDocuments(filter)

    // Récupérer les luminaires avec pagination
    const luminaires = await collection
      .find(filter)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Formater les luminaires
    const formattedLuminaires = luminaires.map((luminaire) => ({
      _id: luminaire._id.toString(),
      id: luminaire._id.toString(),
      nom: luminaire.nom || luminaire["Nom luminaire"] || "",
      name: luminaire.nom || luminaire["Nom luminaire"] || "",
      designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
      artist: luminaire.designer || luminaire["Artiste / Dates"] || "",
      annee: luminaire.annee || luminaire.year || null,
      year: luminaire.annee || luminaire.year || null,
      periode: luminaire.periode || luminaire["Spécialité"] || "",
      specialty: luminaire.periode || luminaire["Spécialité"] || "",
      description: luminaire.description || luminaire["Description"] || "",
      collaboration: luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
      signe: luminaire.signe || luminaire["Signé"] || "",
      signed: luminaire.signe || luminaire["Signé"] || "",
      dimensions: luminaire.dimensions || "",
      materiaux: luminaire.materiaux || [],
      couleurs: luminaire.couleurs || [],
      estimation: luminaire.estimation || "",
      editeur: luminaire.editeur || "",
      filename: luminaire.filename || luminaire["Nom du fichier"] || "",
      image: luminaire.filename ? `/api/images/filename/${luminaire.filename}` : null,
      designerImage: luminaire.designerImageFilename ? `/api/images/filename/${luminaire.designerImageFilename}` : null,
      images: luminaire.images || [],
      isFavorite: false,
      createdAt: luminaire.createdAt || new Date().toISOString(),
      updatedAt: luminaire.updatedAt || new Date().toISOString(),
      "Artiste / Dates": luminaire["Artiste / Dates"] || luminaire.designer || "",
      Spécialité: luminaire["Spécialité"] || luminaire.periode || "",
      "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"] || luminaire.collaboration || "",
      "Nom luminaire": luminaire["Nom luminaire"] || luminaire.nom || "",
      Année: luminaire["Année"] || luminaire.annee?.toString() || "",
      Signé: luminaire["Signé"] || luminaire.signe || "",
      "Nom du fichier": luminaire["Nom du fichier"] || luminaire.filename || "",
    }))

    // Récupérer les options de filtres
    const allLuminaires = await collection.find({}).toArray()

    const designers = [...new Set(allLuminaires.map((l) => l.designer || l["Artiste / Dates"]).filter(Boolean))].sort()

    const periodes = [...new Set(allLuminaires.map((l) => l.periode || l["Spécialité"]).filter(Boolean))].sort()

    const materiauxSet = new Set<string>()
    allLuminaires.forEach((l) => {
      if (l.materiaux && Array.isArray(l.materiaux)) {
        l.materiaux.forEach((m: string) => materiauxSet.add(m))
      }
      if (l["Matériaux"]) {
        const mats = l["Matériaux"].split(",").map((m: string) => m.trim())
        mats.forEach((m: string) => materiauxSet.add(m))
      }
    })

    const couleursSet = new Set<string>()
    allLuminaires.forEach((l) => {
      if (l.couleurs && Array.isArray(l.couleurs)) {
        l.couleurs.forEach((c: string) => couleursSet.add(c))
      }
    })

    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    return NextResponse.json({
      success: true,
      luminaires: formattedLuminaires,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
      filters: {
        designers,
        periodes,
        materiaux: Array.from(materiauxSet).sort(),
        couleurs: Array.from(couleursSet).sort(),
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur API luminaires:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaireData = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(luminaireData)

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      message: "Luminaire créé avec succès",
    })
  } catch (error: any) {
    console.error("❌ Erreur création luminaire:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
