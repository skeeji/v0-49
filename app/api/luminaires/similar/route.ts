import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currentId = searchParams.get("id")
    const periode = searchParams.get("periode") || ""
    const materiaux = searchParams.get("materiaux") || ""

    if (!currentId) {
      return NextResponse.json({ success: false, error: "ID du luminaire actuel requis" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Construire le filtre pour les luminaires similaires
    const filter: any = {
      _id: { $ne: new ObjectId(currentId) }, // Exclure le luminaire actuel
    }

    // Filtre par période si fournie
    if (periode) {
      filter.$or = [{ periode: { $regex: periode, $options: "i" } }, { Spécialité: { $regex: periode, $options: "i" } }]
    }

    // Filtre par matériaux si fournis
    if (materiaux) {
      const materiauxArray = materiaux.split(",").map((m) => m.trim())
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { materiaux: { $in: materiauxArray.map((m) => new RegExp(m, "i")) } },
          { Matériaux: { $regex: materiauxArray.join("|"), $options: "i" } },
        ],
      })
    }

    console.log("🔍 Filtre luminaires similaires:", JSON.stringify(filter, null, 2))

    // Récupérer jusqu'à 4 luminaires similaires
    const similarLuminaires = await collection.find(filter).limit(4).toArray()

    // Formater les résultats
    const formattedSimilar = similarLuminaires.map((luminaire) => ({
      _id: luminaire._id.toString(),
      id: luminaire._id.toString(),
      nom: luminaire.nom || luminaire["Nom luminaire"] || "",
      designer: luminaire.designer || luminaire["Artiste / Dates"] || "",
      image: luminaire.images?.[0] ? `/api/images/filename/${luminaire.images[0]}` : null,
    }))

    return NextResponse.json({
      success: true,
      similar: formattedSimilar,
    })
  } catch (error: any) {
    console.error("❌ Erreur API luminaires similaires:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
