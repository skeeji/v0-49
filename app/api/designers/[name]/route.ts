import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const decodedName = decodeURIComponent(params.name)
    console.log(`🔍 API /api/designers/${decodedName} - Recherche designer`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Rechercher le designer par nom exact ou slug
    const designer = await db.collection("designers").findOne({
      $or: [
        { nom: decodedName },
        { name: decodedName },
        { slug: decodedName },
        { nom: { $regex: new RegExp(decodedName, "i") } },
        { name: { $regex: new RegExp(decodedName, "i") } },
      ],
    })

    if (!designer) {
      console.log(`❌ Designer non trouvé: ${decodedName}`)
      return NextResponse.json(
        {
          success: false,
          error: "Designer non trouvé",
        },
        { status: 404 },
      )
    }

    console.log(`✅ Designer trouvé: ${designer.nom || designer.name}`)

    // Récupérer les luminaires de ce designer
    const luminaires = await db
      .collection("luminaires")
      .find({
        $or: [
          { designer: decodedName },
          { designer: designer.nom },
          { designer: designer.name },
          { designer: { $regex: new RegExp(decodedName, "i") } },
        ],
      })
      .toArray()

    console.log(`📊 ${luminaires.length} luminaires trouvés pour ce designer`)

    return NextResponse.json({
      success: true,
      designer,
      luminaires,
      count: luminaires.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur API designers/[name]:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de la récupération du designer",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
