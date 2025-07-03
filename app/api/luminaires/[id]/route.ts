import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "ID invalide." }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const luminaire = await db.collection("luminaires").findOne({ _id: new ObjectId(id) })

    if (!luminaire) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé." }, { status: 404 })
    }

    // CORRECTION: Retourner des champs propres et indépendants
    const formattedData = {
      id: luminaire._id.toString(),
      nom: luminaire.nom || luminaire["Nom luminaire"] || "",
      designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
      editeur: luminaire.editeur || "",
      annee: luminaire.annee || luminaire["Année"] || "",
      description: luminaire.description || "", // Champ indépendant
      collaboration: luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "", // Champ indépendant
      dimensions: luminaire.dimensions || "",
      estimation: luminaire.estimation || "",
      materiaux: luminaire.materiaux || [],
      image: luminaire.filename ? `/api/images/filename/${luminaire.filename}` : null,
      // Pas besoin de renvoyer l'image du designer ici
    }

    return NextResponse.json({ success: true, data: formattedData })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Erreur serveur." }, { status: 500 })
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
