import { NextResponse } from "next/server"
import clientPromise from "../../../lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE

if (!DBNAME) {
  throw new Error('Invalid/Missing environment variable: "MONGO_INITDB_DATABASE"')
}

// Gérer les requêtes GET pour récupérer les designers
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    const designers = await db.collection("designers").find({}).toArray()

    return NextResponse.json({ success: true, data: designers }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}

// Gérer les requêtes POST pour ajouter un designer
export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    const designerData = await request.json()

    // Logique de validation simple
    if (!designerData.nom) {
      return NextResponse.json({ success: false, error: "Le nom du designer est requis" }, { status: 400 })
    }

    const result = await db.collection("designers").insertOne({
      ...designerData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}
