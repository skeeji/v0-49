import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API GET /api/designers-data appelée")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer tous les designers depuis la collection designers (CSV DESIGNER importé)
    const designers = await db.collection("designers").find({}).toArray()
    console.log(`📊 ${designers.length} designers trouvés dans la collection`)

    // Transformer les données pour le frontend
    const transformedDesigners = designers.map((designer) => ({
      ...designer,
      _id: designer._id.toString(),
    }))

    console.log("✅ Designers chargés avec succès")

    return NextResponse.json({
      success: true,
      designers: transformedDesigners,
      total: transformedDesigners.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/designers-data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
