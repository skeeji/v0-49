import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Récupération des données designers...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer tous les designers depuis la collection designers
    const designers = await db.collection("designers").find({}).toArray()

    console.log(`📊 ${designers.length} designers trouvés dans la base`)

    return NextResponse.json({
      success: true,
      designers: designers,
      count: designers.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur récupération designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
