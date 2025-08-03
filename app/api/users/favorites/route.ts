import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ success: false, error: "Email requis" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("users")

    const user = await collection.findOne({ email })
    const favorites = user?.favorites || []

    return NextResponse.json({
      success: true,
      favorites,
    })
  } catch (error: any) {
    console.error("❌ Erreur GET favorites:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des favoris",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, luminaireId, action } = await request.json()

    if (!email || !luminaireId || !action) {
      return NextResponse.json({ success: false, error: "Paramètres manquants" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("users")

    let updateOperation
    if (action === "add") {
      updateOperation = { $addToSet: { favorites: luminaireId } }
    } else if (action === "remove") {
      updateOperation = { $pull: { favorites: luminaireId } }
    } else {
      return NextResponse.json({ success: false, error: "Action invalide" }, { status: 400 })
    }

    await collection.updateOne(
      { email },
      {
        ...updateOperation,
        $setOnInsert: { email, createdAt: new Date() },
      },
      { upsert: true },
    )

    return NextResponse.json({
      success: true,
      message: `Favori ${action === "add" ? "ajouté" : "supprimé"} avec succès`,
    })
  } catch (error: any) {
    console.error("❌ Erreur POST favorites:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la mise à jour des favoris",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
