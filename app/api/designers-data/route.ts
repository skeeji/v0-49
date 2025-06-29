import { type NextRequest, NextResponse } from "next/server"

// Simulation d'une base de données de designers
const designers: any[] = []

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Récupération des données designers...")
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
