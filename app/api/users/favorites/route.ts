import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get("email")

    if (!userEmail) {
      return NextResponse.json({ success: false, error: "Email requis" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("users")

    const user = await collection.findOne({ email: userEmail })
    const favorites = user?.favorites || []

    return NextResponse.json({
      success: true,
      favorites,
    })
  } catch (error: any) {
    console.error("❌ Erreur récupération favoris:", error)
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

    if (action === "add") {
      await collection.updateOne({ email }, { $addToSet: { favorites: luminaireId } }, { upsert: true })
    } else if (action === "remove") {
      await collection.updateOne({ email }, { $pull: { favorites: luminaireId } })
    }

    return NextResponse.json({
      success: true,
      message: `Favori ${action === "add" ? "ajouté" : "supprimé"} avec succès`,
    })
  } catch (error: any) {
    console.error("❌ Erreur mise à jour favoris:", error)
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
