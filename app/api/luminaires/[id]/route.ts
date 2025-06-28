// Fichier : app/api/luminaires/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

// Gérer les requêtes GET pour récupérer un luminaire par ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 API /api/luminaires/[id] GET - ID:", params.id)

    const client = await clientPromise
    const db = client.db(DBNAME)

    if (!ObjectId.isValid(params.id)) {
      console.log("❌ ID invalide:", params.id)
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const luminaire = await db.collection("luminaires").findOne({ _id: new ObjectId(params.id) })

    if (!luminaire) {
      console.log("❌ Luminaire non trouvé pour ID:", params.id)
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("✅ Luminaire trouvé:", luminaire.nom)

    return NextResponse.json({ success: true, data: luminaire })
  } catch (error) {
    console.error("❌ Erreur API /api/luminaires/[id] GET:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

// Gérer les requêtes PUT pour mettre à jour un luminaire
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("📝 API /api/luminaires/[id] PUT - ID:", params.id)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const updates = await request.json()

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const result = await db
      .collection("luminaires")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: { ...updates, updatedAt: new Date() } })

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("✅ Luminaire mis à jour")

    return NextResponse.json({ success: true, message: "Luminaire mis à jour avec succès" })
  } catch (error) {
    console.error("❌ Erreur API /api/luminaires/[id] PUT:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

// Gérer les requêtes DELETE pour supprimer un luminaire
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🗑️ API /api/luminaires/[id] DELETE - ID:", params.id)

    const client = await clientPromise
    const db = client.db(DBNAME)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const result = await db.collection("luminaires").deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    console.log("✅ Luminaire supprimé")

    return NextResponse.json({ success: true, deletedCount: result.deletedCount })
  } catch (error) {
    console.error("❌ Erreur API /api/luminaires/[id] DELETE:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
