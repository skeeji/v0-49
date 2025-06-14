import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "../../../../lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE

if (!DBNAME) {
  throw new Error('Invalid/Missing environment variable: "MONGO_INITDB_DATABASE"')
}

// Gérer les requêtes GET pour récupérer un luminaire par ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const luminaire = await db.collection("luminaires").findOne({ _id: new ObjectId(params.id) })

    if (!luminaire) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: luminaire }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}

// Gérer les requêtes PUT pour mettre à jour un luminaire
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const updateData = await request.json()

    const result = await db
      .collection("luminaires")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: { ...updateData, updatedAt: new Date() } })

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}

// Gérer les requêtes DELETE pour supprimer un luminaire
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 })
    }

    const result = await db.collection("luminaires").deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ success: true, deletedCount: result.deletedCount }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}
