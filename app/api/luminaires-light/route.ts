import { NextResponse, NextRequest } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "gersaint"

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "0") || 0

    const client = await clientPromise
    const db     = client.db(DBNAME)

    let cursor = db.collection("luminaires").find({}, {
      projection: {
        _id: 1, filename: 1,
        "Nom du fichier": 1,
        "Image luminaire (Nom du fichier)": 1,
        image_principale: 1,
        nom: 1,
        "Artiste / Dates": 1,
        designer: 1,
        designerImageFilename: 1,
        imageId: 1,
        "Nom luminaire": 1,
        annee: 1, "Année": 1, year: 1,
      },
    })

    if (limit > 0) cursor = cursor.limit(limit)

    const luminaires = await cursor.toArray()

    return NextResponse.json(
      { success: true, luminaires },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erreur lors du chargement", details: error.message },
      { status: 500 }
    )
  }
}
