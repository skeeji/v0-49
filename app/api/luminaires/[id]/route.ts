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

    // Vérifier si l'ID est un ObjectId valide
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const luminaire = await collection.findOne({ _id: new ObjectId(params.id) })

    if (!luminaire) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log(`✅ Luminaire trouvé: ${luminaire.nom}`)

    // Transformer les données pour le frontend
    const transformedLuminaire = {
      _id: luminaire._id.toString(),
      nom: luminaire.nom || "",
      designer: luminaire.designer || "",
      annee: luminaire.annee || new Date().getFullYear(),
      periode: luminaire.periode || "",
      description: luminaire.description || "",
      materiaux: luminaire.materiaux || [],
      couleurs: luminaire.couleurs || [],
      dimensions: luminaire.dimensions || "",
      images: luminaire.images || [],
      filename: luminaire["Nom du fichier"] || luminaire.filename || "",
      specialite: luminaire.specialite || "",
      collaboration: luminaire.collaboration || "",
      signe: luminaire.signe || "",
      estimation: luminaire.estimation || "",
      isFavorite: luminaire.isFavorite || false,
      createdAt: luminaire.createdAt,
      updatedAt: luminaire.updatedAt,
    }

    return NextResponse.json({
      success: true,
      luminaire: transformedLuminaire,
    })
  } catch (error: any) {
    console.error(`❌ Erreur API luminaire ${params.id}:`, error)
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
