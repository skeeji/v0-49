import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
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

    const query: any = {}

    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: "i" } },
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
      ]
    }

    if (categorie && categorie !== "all") {
      query.$or = [{ categorie: categorie }, { Catégorie: categorie }]
    }

    if (materiau && materiau !== "all") {
      query.$or = [
        { materiaux: { $regex: materiau, $options: "i" } },
        { Matériaux: { $regex: materiau, $options: "i" } },
      ]
    }

    if (yearMin && yearMax) {
      const minYear = Number.parseInt(yearMin)
      const maxYear = Number.parseInt(yearMax)

      if (!isNaN(minYear) && !isNaN(maxYear)) {
        query.$and = query.$and || []
        query.$and.push({
          $or: [
            {
              annee: {
                $gte: minYear.toString(),
                $lte: maxYear.toString(),
              },
            },
            {
              Année: {
                $gte: minYear.toString(),
                $lte: maxYear.toString(),
              },
            },
          ],
        })
      }
    }

    const sortFieldMap: { [key: string]: string } = {
      nom: "nom",
      designer: "designer",
      annee: "annee",
    }

    const actualSortField = sortFieldMap[sortField] || "nom"
    const sortOrder = sortDirection === "desc" ? -1 : 1

    const skip = (page - 1) * limit

    const [luminaires, total] = await Promise.all([
      collection
        .find(query)
        .sort({ [actualSortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ])

    // CORRECTION: Construire correctement les URLs des images
    const luminairesWithImages = luminaires.map((lum) => {
      let imageUrl = null

      // Priorité 1: Utiliser l'imageId si disponible
      if (lum.imageId) {
        imageUrl = `/api/images/${lum.imageId}`
        console.log(`✅ Luminaire ${lum.nom || lum["Nom luminaire"]} - Image par ID: ${imageUrl}`)
      }
      // Priorité 2: Utiliser le filename
      else if (lum.filename || lum["Nom du fichier"] || lum["Image luminaire (Nom du fichier)"]) {
        const filename = lum.filename || lum["Nom du fichier"] || lum["Image luminaire (Nom du fichier)"]
        imageUrl = `/api/images/filename/${filename}`
        console.log(`✅ Luminaire ${lum.nom || lum["Nom luminaire"]} - Image par filename: ${imageUrl}`)
      }

      return {
        ...lum,
        _id: lum._id.toString(),
        image: imageUrl,
      }
    })

    const hasMore = skip + luminaires.length < total

    return NextResponse.json({
      success: true,
      luminaires: luminairesWithImages,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires:", error)
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
    const body = await request.json()

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const newLuminaire = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(newLuminaire)

    return NextResponse.json({
      success: true,
      message: "Luminaire créé avec succès",
      id: result.insertedId.toString(),
    })
  } catch (error: any) {
    console.error("❌ Erreur création luminaire:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la création",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
