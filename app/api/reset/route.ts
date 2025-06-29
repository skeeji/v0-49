import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { clearGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🗑️ API /api/reset - Début de la suppression")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer toutes les collections
    const collections = ["luminaires", "designers", "timeline", "users"]
    const deletedCounts = {}

    for (const collectionName of collections) {
      try {
        const result = await db.collection(collectionName).deleteMany({})
        deletedCounts[collectionName] = result.deletedCount
        console.log(`🗑️ Collection ${collectionName}: ${result.deletedCount} documents supprimés`)
      } catch (error) {
        console.log(`⚠️ Collection ${collectionName} n'existe pas ou erreur:`, error)
        deletedCounts[collectionName] = 0
      }
    }

    // Supprimer tous les fichiers GridFS
    try {
      await clearGridFS()
      console.log("🗑️ Tous les fichiers GridFS supprimés")
    } catch (error) {
      console.log("⚠️ Erreur suppression GridFS:", error)
    }

    console.log("✅ Reset terminé")

    return NextResponse.json({
      success: true,
      message: "Base de données réinitialisée avec succès",
      deletedCounts,
    })
  } catch (error: any) {
    console.error("❌ Erreur reset:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la réinitialisation",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
