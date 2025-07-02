import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("Loading luminaire with ID:", params.id)

    const { db } = await connectToDatabase()
    const collection = db.collection("luminaires")

    // Vérifier si l'ID est un ObjectId valide
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const luminaire = await collection.findOne({ _id: new ObjectId(params.id) })

    if (!luminaire) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("Luminaire found:", luminaire.nom || luminaire["Nom de l'objet"])

    return NextResponse.json({
      success: true,
      luminaire: luminaire,
    })
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du luminaire:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération du luminaire",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    const collection = db.collection("luminaires")

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const body = await request.json()

    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { ...body, updatedAt: new Date() } },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du luminaire:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la mise à jour du luminaire",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    const collection = db.collection("luminaires")

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const result = await collection.deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Erreur lors de la suppression du luminaire:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la suppression du luminaire",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}
