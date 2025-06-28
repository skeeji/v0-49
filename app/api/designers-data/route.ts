import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Récupération des données designers...")

    const { db } = await connectToDatabase()
    const designers = await db.collection("designers").find({}).toArray()

    console.log(`📊 ${designers.length} designers trouvés dans la base`)

    return NextResponse.json({
      success: true,
      designers: designers,
    })
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des designers:", error)
    return NextResponse.json({ success: false, error: "Erreur lors de la récupération des designers" }, { status: 500 })
  }
}
