import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "gersaint"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaires = await collection
      .find({}, {
        projection: {
          _id: 1,
          filename: 1,
          "Nom du fichier": 1,
          "Image luminaire (Nom du fichier)": 1,
          image_principale: 1,
          nom: 1,
        },
      })
      .toArray()

    return NextResponse.json(
      { luminaires },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300",
        },
      }
    )
  } catch (error: any) {
    console.error("❌ Erreur API /api/luminaires-light:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors du chargement", details: error.message },
      { status: 500 }
    )
  }
}
