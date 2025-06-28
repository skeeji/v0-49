import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 Chargement luminaire ID:", params.id)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaire = await collection.findOne({ _id: new ObjectId(params.id) })

    if (!luminaire) {
      return NextResponse.json({ error: "Luminaire non trouvé" }, { status: 404 })
    }

    // Transformer les données pour le frontend
    const transformedLuminaire = {
      ...luminaire,
      _id: luminaire._id.toString(),
      images: luminaire.images || [],
      materiaux: luminaire.materiaux || [],
      couleurs: luminaire.couleurs || [],
      // CORRECTION: Convertir l'objet dimensions en string pour éviter l'erreur React #31
      dimensions:
        typeof luminaire.dimensions === "object" && luminaire.dimensions !== null
          ? `${luminaire.dimensions.hauteur || ""}x${luminaire.dimensions.largeur || ""}x${luminaire.dimensions.profondeur || ""}`.replace(
              /^x+|x+$/g,
              "",
            ) || ""
          : luminaire.dimensions || "",
    }

    console.log("📊 Réponse API luminaire:", { success: true, data: transformedLuminaire })

    return NextResponse.json({
      success: true,
      data: transformedLuminaire,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/luminaires/[id]:", error)
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("✏️ Mise à jour luminaire ID:", params.id)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 })
    }

    const body = await request.json()
    console.log("📥 Données de mise à jour:", JSON.stringify(body, null, 2))

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Préparer les données de mise à jour
    const updateData = {
      nom: body.nom || "",
      designer: body.designer || "",
      annee: Number.parseInt(body.annee) || new Date().getFullYear(),
      periode: body.periode || "",
      description: body.description || "",
      materiaux: Array.isArray(body.materiaux) ? body.materiaux : [],
      couleurs: Array.isArray(body.couleurs) ? body.couleurs : [],
      dimensions: body.dimensions || {},
      images: Array.isArray(body.images) ? body.images : [],
      filename: body.filename || "",
      specialite: body.specialite || "",
      collaboration: body.collaboration || "",
      signe: body.signe || "",
      estimation: body.estimation || "",
      updatedAt: new Date(),
    }

    const result = await collection.updateOne({ _id: new ObjectId(params.id) }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log(`✅ Luminaire mis à jour: ${params.id}`)

    return NextResponse.json({
      success: true,
      message: "Luminaire mis à jour avec succès",
      id: params.id,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans PUT /api/luminaires/[id]:", error)
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
    console.log("🗑️ Suppression luminaire ID:", params.id)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const result = await collection.deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log(`✅ Luminaire supprimé: ${params.id}`)

    return NextResponse.json({
      success: true,
      message: "Luminaire supprimé avec succès",
    })
  } catch (error: any) {
    console.error("❌ Erreur dans DELETE /api/luminaires/[id]:", error)
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
