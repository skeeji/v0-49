import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

// Garde ta fonction utilitaire originale au cas où elle est utilisée ailleurs
function extractYear(yearString: string | number): number | null {
  if (typeof yearString === "number") return yearString
  if (!yearString) return null
  const str = String(yearString).trim()
  const matches = str.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g)
  return matches && matches.length > 0 ? Number.parseInt(matches[0], 10) : null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const categorie = searchParams.get("categorie") || ""
    const materiau = searchParams.get("materiau") || ""
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const andConditions: any[] = []

    // 1. Gestion des filtres textuels (Recherche, Catégorie, Matériaux)
    if (search) {
      andConditions.push({
        $or: [
          { nom: { $regex: search, $options: "i" } },
          { "Nom luminaire": { $regex: search, $options: "i" } },
          { designer: { $regex: search, $options: "i" } },
          { "Artiste / Dates": { $regex: search, $options: "i" } },
        ],
      })
    }

    if (categorie && categorie !== "all") {
      andConditions.push({ $or: [{ categorie: categorie }, { Catégorie: categorie }] })
    }

    if (materiau && materiau !== "all") {
      andConditions.push({ 
        $or: [
          { materiaux: { $regex: materiau, $options: "i" } }, 
          { Matériaux: { $regex: materiau, $options: "i" } }
        ] 
      })
    }

    // 2. Construction du Pipeline d'Agrégation (Toujours utilisé pour inclure les images designers)
    const pipeline: any[] = []

    // Étape A : Extraction de l'année (Ta logique Regex originale portée en MongoDB)
    pipeline.push({
      $addFields: {
        extractedYear: {
          $let: {
            vars: {
              yearField: { $ifNull: ["$annee", { $ifNull: ["$Année", { $ifNull: ["$year", ""] }] }] },
            },
            in: {
              $cond: {
                if: { $eq: [{ $type: "$$yearField" }, "number"] },
                then: "$$yearField",
                else: {
                  $let: {
                    vars: {
                      match: { $regexFind: { input: { $toString: "$$yearField" }, regex: "\\b(1[0-9]{3}|20[0-9]{2})\\b" } },
                    },
                    in: {
                      $cond: {
                        if: { $ne: ["$$match", null] },
                        then: { $toInt: "$$match.match" },
                        else: null,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    // Étape B : Jointure avec la collection designers (Pour ton fichier CSV)
    pipeline.push({
      $lookup: {
        from: "designers",
        let: { artistName: { $ifNull: ["$designer", "$Artiste / Dates"] } },
        pipeline: [
          { $match: { $expr: { $eq: ["$Nom", "$$artistName"] } } }
        ],
        as: "designerInfo"
      }
    })

    // Étape C : Aplatir l'image du designer dans le document principal
    pipeline.push({
      $addFields: {
        designerImageFilename: { $arrayElemAt: ["$designerInfo.imagedesigner", 0] }
      }
    })

    // Étape D : Application des Matchs (Filtres + Plage d'années)
    if (andConditions.length > 0) {
      pipeline.push({ $match: { $and: andConditions } })
    }

    if (yearMin && yearMax) {
      pipeline.push({
        $match: {
          extractedYear: { $gte: Number.parseInt(yearMin), $lte: Number.parseInt(yearMax) }
        }
      })
    }

    // Étape E : Tri
    const sortObject: any = {}
    if (sortField === "nom") {
      sortObject.nom = sortDirection === "asc" ? 1 : -1
    } else if (sortField === "designer") {
      sortObject.designer = sortDirection === "asc" ? 1 : -1
    } else if (sortField === "annee") {
      sortObject.extractedYear = sortDirection === "asc" ? 1 : -1
    } else {
        sortObject._id = 1
    }
    pipeline.push({ $sort: sortObject })

    // Étape F : Pagination et exécution
    const countPipeline = [...pipeline]
    countPipeline.push({ $count: "total" })
    
    pipeline.push({ $skip: (page - 1) * limit })
    pipeline.push({ $limit: limit })

    const [luminaires, countResult] = await Promise.all([
      collection.aggregate(pipeline).toArray(),
      collection.aggregate(countPipeline).toArray()
    ])

    const total = countResult.length > 0 ? countResult[0].total : 0

    return NextResponse.json({
      success: true,
      luminaires: luminaires,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        hasMore: (page - 1) * limit + luminaires.length < total,
      },
    })

  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur", details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db(DBNAME)
    const result = await db.collection("luminaires").insertOne(body)
    return NextResponse.json({ success: true, id: result.insertedId })
  } catch (error: any) {
    console.error("❌ Erreur création luminaire:", error)
    return NextResponse.json({ success: false, error: "Erreur création", details: error.message }, { status: 500 })
  }
}
