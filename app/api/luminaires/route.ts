import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || "1")
    const limit = Number(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
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
        { "Nom luminaire": { $regex: search, $options: "i" } },
        { nom: { $regex: search, $options: "i" } },
        { "Artiste / Dates": { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
      ]
    }

    if (yearMin && yearMax) {
      filter.$or = [
        { annee: { $gte: Number(yearMin), $lte: Number(yearMax) } },
        { Année: { $gte: Number(yearMin), $lte: Number(yearMax) } },
      ]
    }

    // Construction du tri
    const sort: any = {}
    const direction = sortDirection === "desc" ? -1 : 1

    if (sortField === "annee") {
      sort.annee = direction
      sort["Année"] = direction
    } else if (sortField === "designer") {
      sort["Artiste / Dates"] = direction
      sort.designer = direction
    } else {
      sort["Nom luminaire"] = direction
      sort.nom = direction
    }

    const total = await collection.countDocuments(filter)
    const luminaires = await collection
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Formatage des données pour l'affichage
    const formattedLuminaires = luminaires.map((luminaire) => ({
      _id: luminaire._id.toString(),
      id: luminaire._id.toString(),
      nom: luminaire["Nom luminaire"] || luminaire.nom || "",
      designer: luminaire["Artiste / Dates"] || luminaire.designer || "",
      editeur: luminaire["Editeur"] || luminaire.editeur || "",
      annee: luminaire.annee || luminaire["Année"] || null,
      dimensions: luminaire["Dimensions"] || luminaire.dimensions || "",
      estimation: luminaire["Estimation"] || luminaire.estimation || "",
      collaboration: luminaire["Collaboration / Œuvre"] || luminaire.collaboration || "",
      description: luminaire["Description"] || luminaire.description || "",
      materiaux: luminaire["Matériaux"] || luminaire.materiaux || "",
      periode: luminaire["Spécialité"] || luminaire.periode || "",
      signe: luminaire["Signé"] || luminaire.signe || "",
      image: luminaire.filename ? `/api/images/filename/${luminaire.filename}` : null,
      designerImage: luminaire.designerImageFilename ? `/api/images/filename/${luminaire.designerImageFilename}` : null,
      filename: luminaire["Nom du fichier"] || luminaire.filename || "",
    }))

    return NextResponse.json({
      success: true,
      luminaires: formattedLuminaires,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur GET /api/luminaires:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const luminaireData = await request.json()

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.insertOne({
      ...luminaireData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      message: "Luminaire créé avec succès",
    })
  } catch (error: any) {
    console.error("❌ Erreur POST /api/luminaires:", error)
    return NextResponse.json({ success: false, error: "Erreur lors de la création" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const updates = await request.json()

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Luminaire mis à jour" })
  } catch (error: any) {
    console.error("❌ Erreur PUT /api/luminaires:", error)
    return NextResponse.json({ success: false, error: "Erreur lors de la mise à jour" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Luminaire supprimé" })
  } catch (error: any) {
    console.error("❌ Erreur DELETE /api/luminaires:", error)
    return NextResponse.json({ success: false, error: "Erreur lors de la suppression" }, { status: 500 })
  }
}
