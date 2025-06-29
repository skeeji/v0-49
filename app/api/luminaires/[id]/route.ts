import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log("🔍 API /api/luminaires/[id] GET - ID:", id)

    if (!id) {
      return NextResponse.json({ success: false, error: "ID manquant" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Rechercher le luminaire par ID
    const luminaire = await db.collection("luminaires").findOne({ _id: new ObjectId(id) })

    if (!luminaire) {
      console.log("❌ Luminaire non trouvé:", id)
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("✅ Luminaire trouvé:", luminaire.nom)

    return NextResponse.json({
      success: true,
      data: luminaire,
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
    const { id } = params
    const body = await request.json()
    console.log("📝 API /api/luminaires/[id] PUT - ID:", id, "Data:", body)

    if (!id) {
      return NextResponse.json({ success: false, error: "ID manquant" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Mettre à jour le luminaire
    const result = await db.collection("luminaires").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...body,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("✅ Luminaire mis à jour:", id)

    return NextResponse.json({
      success: true,
      message: "Luminaire mis à jour avec succès",
    })
  } catch (error: any) {
    console.error("❌ Erreur dans PUT /api/luminaires/[id]:", error)
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
