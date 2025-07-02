import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 API /api/luminaires/${params.id} - Récupération du luminaire`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaire = await collection.findOne({ _id: new ObjectId(params.id) })

    if (!luminaire) {
      console.log(`❌ Luminaire non trouvé: ${params.id}`)
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log(`✅ Luminaire trouvé: ${luminaire.nom || luminaire["Nom luminaire"]}`)

    // Formater le luminaire avec tous les champs
    const formattedLuminaire = {
      _id: luminaire._id.toString(),
      id: luminaire._id.toString(),

      // Champs principaux avec fallback
      nom: luminaire.nom || luminaire["Nom luminaire"] || "",
      name: luminaire.nom || luminaire["Nom luminaire"] || "",
      designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
      artist: luminaire.designer || luminaire["Artiste / Dates"] || "",
      annee: luminaire.annee || (luminaire["Année"] ? Number.parseInt(luminaire["Année"]) : null),
      year: luminaire.annee || (luminaire["Année"] ? Number.parseInt(luminaire["Année"]) : null),
      periode: luminaire.periode || luminaire["Spécialité"] || "",
      specialty: luminaire.periode || luminaire["Spécialité"] || "",
      description: luminaire.description || luminaire["Collaboration / Œuvre"] || "",
      collaboration: luminaire.description || luminaire["Collaboration / Œuvre"] || "",
      signe: luminaire.signe || luminaire["Signé"] || "",
      signed: luminaire.signe || luminaire["Signé"] || "",
      filename: luminaire.filename || luminaire["Nom du fichier"] || "",

      // Autres champs
      materiaux: luminaire.materiaux || [],
      materials: Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join(", ") : "",
      couleurs: luminaire.couleurs || [],
      dimensions: luminaire.dimensions || {},
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
    }

    return NextResponse.json({
      success: true,
      data: formattedLuminaire,
    })
  } catch (error: any) {
    console.error(`❌ Erreur récupération luminaire ${params.id}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`📝 API /api/luminaires/${params.id} - Mise à jour du luminaire`)

    const updates = await request.json()
    console.log("📊 Mises à jour:", updates)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Mapper les champs pour la mise à jour
    const mappedUpdates: any = { ...updates }

    // Synchroniser les champs principaux avec les champs CSV
    if (updates.name) {
      mappedUpdates.nom = updates.name
      mappedUpdates["Nom luminaire"] = updates.name
    }
    if (updates.artist) {
      mappedUpdates.designer = updates.artist
      mappedUpdates["Artiste / Dates"] = updates.artist
    }
    if (updates.year) {
      mappedUpdates.annee = Number.parseInt(updates.year)
      mappedUpdates["Année"] = updates.year.toString()
    }
    if (updates.specialty) {
      mappedUpdates.periode = updates.specialty
      mappedUpdates["Spécialité"] = updates.specialty
    }
    if (updates.collaboration) {
      mappedUpdates.description = updates.collaboration
      mappedUpdates["Collaboration / Œuvre"] = updates.collaboration
    }
    if (updates.signed) {
      mappedUpdates.signe = updates.signed
      mappedUpdates["Signé"] = updates.signed
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          ...mappedUpdates,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log(`✅ Luminaire mis à jour: ${params.id}`)

    return NextResponse.json({
      success: true,
      message: "Luminaire mis à jour avec succès",
    })
  } catch (error: any) {
    console.error(`❌ Erreur mise à jour luminaire ${params.id}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la mise à jour du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🗑️ API /api/luminaires/${params.id} - Suppression du luminaire`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log(`✅ Luminaire supprimé: ${params.id}`)

    return NextResponse.json({
      success: true,
      message: "Luminaire supprimé avec succès",
    })
  } catch (error: any) {
    console.error(`❌ Erreur suppression luminaire ${params.id}:`, error)
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
