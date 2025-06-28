import { type NextRequest, NextResponse } from "next/server"
// MODIFICATION : On utilise 'clientPromise', la méthode standard et stable de votre projet.
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Récupération des données designers (avec connexion corrigée)...")

    // MODIFICATION : Logique de connexion standardisée
    const client = await clientPromise
    const db = client.db(DBNAME)

    const designers = await db.collection("designers").find({}).toArray()

    console.log(`📊 ${designers.length} designers trouvés dans la base`)

    return NextResponse.json({
      success: true,
      designers: designers,
    })
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des designers:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur serveur lors de la récupération des designers" 
      }, 
      { status: 500 }
    )
  }
}
