import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const descriptions = await db.collection("timelineDescriptions").find({}).sort({ periode: 1 }).toArray()
    return NextResponse.json(descriptions)
  } catch (error) {
    console.error("Erreur lors de la récupération des descriptions:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const { periode, description } = await request.json()

    const timelineDescription = {
      periode,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("timelineDescriptions").insertOne(timelineDescription)
    return NextResponse.json(
      {
        _id: result.insertedId,
        ...timelineDescription,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erreur lors de la création de la description:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const { periode, description } = await request.json()

    const result = await db.collection("timelineDescriptions").updateOne(
      { periode },
      {
        $set: {
          description,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la description:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
