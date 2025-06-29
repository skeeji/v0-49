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

    console.log(`✅ Luminaire trouvé: ${luminaire.nom}`)

    return NextResponse.json({
      success: true,
      data: luminaire,
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

    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          ...updates,
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
