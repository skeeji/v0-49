import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase()
    const luminaire = await db.collection("luminaires").findOne({ _id: new ObjectId(params.id) })

    if (!luminaire) {
      return NextResponse.json({ error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json(luminaire)
  } catch (error) {
    console.error("Erreur lors de la récupération du luminaire:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase()
    const updates = await request.json()

    const result = await db.collection("luminaires").updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la mise à jour du luminaire:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase()
    const result = await db.collection("luminaires").deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la suppression du luminaire:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
