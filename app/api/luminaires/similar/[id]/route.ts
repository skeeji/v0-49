import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer le luminaire de référence
    const luminaire = await db.collection("luminaires").findOne({ _id: new ObjectId(params.id) })

    if (!luminaire) {
      return NextResponse.json({ error: "Luminaire non trouvé" }, { status: 404 })
    }

    // Rechercher des luminaires similaires
    const similarLuminaires = await db
      .collection("luminaires")
      .find({
        _id: { $ne: new ObjectId(params.id) },
        $or: [
          { designer: luminaire.designer },
          { periode: luminaire.periode },
          { materiaux: { $in: luminaire.materiaux } },
          { couleurs: { $in: luminaire.couleurs } },
        ],
      })
      .limit(6)
      .toArray()

    return NextResponse.json(similarLuminaires)
  } catch (error) {
    console.error("Erreur lors de la recherche de luminaires similaires:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
