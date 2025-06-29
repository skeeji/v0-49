import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 API /api/luminaires/${params.id} - Recherche luminaire`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Vérifier si l'ID est un ObjectId valide
    if (!ObjectId.isValid(params.id)) {
      console.log(`❌ ID invalide: ${params.id}`)
      return NextResponse.json(
        {
          success: false,
          error: "ID de luminaire invalide",
        },
        { status: 400 },
      )
    }

    const luminaire = await db.collection("luminaires").findOne({
      _id: new ObjectId(params.id),
    })

    if (!luminaire) {
      console.log(`❌ Luminaire non trouvé: ${params.id}`)
      return NextResponse.json(
        {
          success: false,
          error: "Luminaire non trouvé",
        },
        { status: 404 },
      )
    }

    console.log(`✅ Luminaire trouvé: ${luminaire.nom || luminaire.title || "Sans nom"}`)

    return NextResponse.json({
      success: true,
      luminaire,
    })
  } catch (error: any) {
    console.error("❌ Erreur API luminaires/[id]:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de la récupération du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
