import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db("gersaint")

    const designers = await db
      .collection("designers")
      .find({}, { projection: { _id: 0, Nom: 1, imagedesigner: 1 } })
      .toArray()

    const response = NextResponse.json({ success: true, designers })
    response.headers.set("Cache-Control", "public, s-maxage=300")
    return response
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des designers", details: error.message },
      { status: 500 },
    )
  }
}
