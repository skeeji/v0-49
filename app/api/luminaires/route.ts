import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

function extractYear(yearString: string | number): number | null {
  if (typeof yearString === "number") {
    return yearString
  }

  if (!yearString) return null

  const str = String(yearString).trim()

  // Extraire tous les nombres de 4 chiffres
  const matches = str.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g)

  if (matches && matches.length > 0) {
    // Retourner le premier nombre trouvé
    return Number.parseInt(matches[0], 10)
  }

  return null
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

    console.log("[v0] Filtering with years:", { yearMin, yearMax })

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const filter: any = {}
    const andConditions: any[] = []

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
      andConditions.push({
        $or: [{ categorie: categorie }, { Catégorie: categorie }],
      })
    }

    if (materiau && materiau !== "all") {
      andConditions.push({
        $or: [{ materiaux: { $regex: materiau, $options: "i" } }, { Matériaux: { $regex: materiau, $options: "i" } }],
      })
    }

    if (yearMin && yearMax) {
      const min = Number.parseInt(yearMin)
      const max = Number.parseInt(yearMax)

      console.log("[v0] Year filter range:", { min, max })

      // Créer une agrégation pour extraire l'année et filtrer
      const pipeline: any[] = []

      // Étape 1: Ajouter un champ calculé avec l'année extraite
      pipeline.push({
        $addFields: {
          extractedYear: {
            $let: {
              vars: {
                yearField: {
                  $ifNull: ["$annee", { $ifNull: ["$Année", { $ifNull: ["$year", ""] }] }],
                },
              },
              in: {
                $cond: {
                  if: { $eq: [{ $type: "$$yearField" }, "number"] },
                  then: "$$yearField",
                  else: {
                    $let: {
                      vars: {
                        match: {
                          $regexFind: { input: { $toString: "$$yearField" }, regex: "\\b(1[0-9]{3}|20[0-9]{2})\\b" },
                        },
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

      // Étape 2: Filtrer par la plage d'années
      if (andConditions.length > 0) {
        pipeline.push({ $match: { $and: andConditions } })
      }

      pipeline.push({
        $match: {
          extractedYear: {
            $gte: min,
            $lte: max,
          },
        },
      })

      // Étape 3: Trier
      const sortObject: any = {}
      if (sortField === "nom") {
        sortObject.nom = sortDirection === "asc" ? 1 : -1
      } else if (sortField === "designer") {
        sortObject.designer = sortDirection === "asc" ? 1 : -1
      } else if (sortField === "annee") {
        sortObject.extractedYear = sortDirection === "asc" ? 1 : -1
      }

      if (Object.keys(sortObject).length > 0) {
        pipeline.push({ $sort: sortObject })
      }

      // Étape 4: Pagination
      pipeline.push({ $skip: (page - 1) * limit })
      pipeline.push({ $limit: limit })

      console.log("[v0] Using aggregation pipeline for year filtering")

      const luminaires = await collection.aggregate(pipeline).toArray()

      // Compter le total avec le filtre d'année
      const countPipeline = pipeline.slice(0, -2) // Retirer skip et limit
      countPipeline.push({ $count: "total" })
      const countResult = await collection.aggregate(countPipeline).toArray()
      const total = countResult.length > 0 ? countResult[0].total : 0

      console.log("[v0] Filtered luminaires:", luminaires.length, "Total:", total)

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
    } else {
      // Pas de filtre d'année, utiliser le code standard
      if (andConditions.length > 0) {
        filter.$and = andConditions
      }

      const sortObject: any = {}
      if (sortField === "nom") {
        sortObject.nom = sortDirection === "asc" ? 1 : -1
      } else if (sortField === "designer") {
        sortObject.designer = sortDirection === "asc" ? 1 : -1
      } else if (sortField === "annee") {
        sortObject.annee = sortDirection === "asc" ? 1 : -1
      }

      const total = await collection.countDocuments(filter)
      const skip = (page - 1) * limit
      const luminaires = await collection.find(filter).sort(sortObject).skip(skip).limit(limit).toArray()

      return NextResponse.json({
        success: true,
        luminaires: luminaires,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          hasMore: skip + luminaires.length < total,
        },
      })
    }
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du chargement des luminaires",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.insertOne(body)

    return NextResponse.json({
      success: true,
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
