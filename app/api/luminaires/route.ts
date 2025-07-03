import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId, GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

// FORMATEUR DE DONNÉES CENTRALISÉ POUR LA COHÉRENCE
const formatLuminaire = (luminaire: any) => {
  if (!luminaire) return null
  return {
    _id: luminaire._id.toString(),
    id: luminaire._id.toString(),
    nom: luminaire.nom || luminaire["Nom luminaire"] || "",
    designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
    annee: luminaire.annee || (luminaire["Année"] ? Number.parseInt(String(luminaire["Année"])) : null),
    periode: luminaire.periode || luminaire["Spécialité"] || "",
    specialite: luminaire.periode || luminaire["Spécialité"] || "",
    collaboration: luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
    signe: luminaire.signe || luminaire["Signé"] || "",
    description: luminaire.description || "",
    dimensions: luminaire.dimensions || "",
    estimation: luminaire.estimation || "",
    editeur: luminaire.editeur || "",
    materiaux: Array.isArray(luminaire.materiaux) ? luminaire.materiaux : [],
    images: Array.isArray(luminaire.images) ? luminaire.images : [],
    image: luminaire.images?.[0] ? `/api/images/filename/${luminaire.images[0]}` : null,
  }
}

// FONCTION GET UNIFIÉE
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")
    const id = searchParams.get("id")

    if (id) {
      // CAS : PAGE DE DÉTAIL
      if (!ObjectId.isValid(id)) return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
      const luminaire = await collection.findOne({ _id: new ObjectId(id) })
      if (!luminaire) return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })

      const formatted = formatLuminaire(luminaire)
      const similarFilter: any = { _id: { $ne: new ObjectId(id) } }
      const orConditions = []
      if (formatted.periode) orConditions.push({ periode: formatted.periode })
      if (formatted.materiaux.length > 0) orConditions.push({ materiaux: { $in: formatted.materiaux } })
      if (orConditions.length > 0) similarFilter.$or = orConditions

      const similarRaw = await collection.find(similarFilter).limit(6).toArray()
      return NextResponse.json({
        success: true,
        luminaire: formatted,
        similar: similarRaw.map(formatLuminaire),
      })
    }

    // CAS : PAGE GALERIE (LISTE)
    const page = Number(searchParams.get("page") || "1")
    const limit = Number(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const designer = searchParams.get("designer") || ""
    const periode = searchParams.get("periode") || ""
    const materiaux = searchParams.get("materiaux") || ""
    const couleurs = searchParams.get("couleurs") || ""
    const sliderModified = searchParams.get("sliderModified") === "true"
    const yearMin = searchParams.get("yearMin")
    const yearMax = searchParams.get("yearMax")
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"

    const filter: any = {}

    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
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

    if (sliderModified && yearMin && yearMax) {
      filter.annee = { $gte: Number(yearMin), $lte: Number(yearMax) }
    }

    const sort: any = {}
    const direction = sortDirection === "desc" ? -1 : 1
    if (sortField === "annee") sort.annee = direction
    else if (sortField === "designer") sort.designer = direction
    else sort.nom = direction

    const total = await collection.countDocuments(filter)
    const luminairesRaw = await collection
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Calculer les options de filtres
    const allLuminaires = await collection.find({}).limit(1000).toArray()
    const designers = [...new Set(allLuminaires.map((l) => l.designer || l["Artiste / Dates"]).filter(Boolean))].sort()
    const periodes = [...new Set(allLuminaires.map((l) => l.periode || l["Spécialité"]).filter(Boolean))].sort()
    const allMateriaux = [...new Set(allLuminaires.flatMap((l) => l.materiaux || []).filter(Boolean))].sort()
    const allCouleurs = [...new Set(allLuminaires.flatMap((l) => l.couleurs || []).filter(Boolean))].sort()

    return NextResponse.json({
      success: true,
      luminaires: luminairesRaw.map(formatLuminaire),
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
    })
  } catch (error: any) {
    console.error("❌ Erreur GET:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur GET" }, { status: 500 })
  }
}

// FONCTION POST UNIFIÉE
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get("image") as File | null

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaireData: any = { createdAt: new Date(), updatedAt: new Date() }
    formData.forEach((value, key) => {
      if (key !== "image") luminaireData[key] = value
    })
    if (luminaireData.annee) luminaireData.annee = Number(luminaireData.annee)
    if (luminaireData.materiaux && typeof luminaireData.materiaux === "string") {
      luminaireData.materiaux = luminaireData.materiaux
        .split(",")
        .map((m: string) => m.trim())
        .filter(Boolean)
    }

    const result = await collection.insertOne(luminaireData)
    const newId = result.insertedId

    if (imageFile) {
      const bucket = new GridFSBucket(db, { bucketName: "uploads" })
      const uploadStream = bucket.openUploadStream(imageFile.name)
      const buffer = await imageFile.arrayBuffer()
      uploadStream.end(new Uint8Array(buffer))

      await collection.updateOne(
        { _id: newId },
        {
          $set: {
            images: [imageFile.name],
            filename: imageFile.name,
            "Nom du fichier": imageFile.name,
          },
        },
      )
    }

    return NextResponse.json({ success: true, message: "Luminaire créé", id: newId })
  } catch (error: any) {
    console.error("❌ Erreur POST:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur POST" }, { status: 500 })
  }
}

// FONCTION PUT UNIFIÉE
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id || !ObjectId.isValid(id))
      return NextResponse.json({ success: false, error: "ID manquant ou invalide" }, { status: 400 })

    const updates = await request.json()
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    await collection.updateOne({ _id: new ObjectId(id) }, { $set: { ...updates, updatedAt: new Date() } })

    return NextResponse.json({ success: true, message: "Luminaire mis à jour" })
  } catch (error: any) {
    console.error("❌ Erreur PUT:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur PUT" }, { status: 500 })
  }
}

// FONCTION DELETE UNIFIÉE
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

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

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
