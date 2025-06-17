import { NextResponse } from "next/server"
import clientPromise from "../../../lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE

if (!DBNAME) {
  throw new Error('Invalid/Missing environment variable: "MONGO_INITDB_DATABASE"')
}

// Gérer les requêtes GET pour récupérer les luminaires
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    const luminaires = await db.collection("luminaires").find({}).limit(20).toArray()

    return NextResponse.json({ success: true, data: luminaires }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}

// Gérer les requêtes POST pour ajouter un luminaire
export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    const luminaireData = await request.json()

    // Logique de validation simple
    if (!luminaireData.nom) {
      return NextResponse.json({ success: false, error: "Le nom du luminaire est requis" }, { status: 400 })
    }

    const result = await db.collection("luminaires").insertOne(luminaireData)

    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}
