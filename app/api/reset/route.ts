import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { clearGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🧹 API /api/reset - Début du nettoyage")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer toutes les collections
    const collections = ["luminaires", "designers", "timeline", "users"]
    let deletedCount = 0

    for (const collectionName of collections) {
      try {
        const result = await db.collection(collectionName).deleteMany({})
        deletedCount += result.deletedCount
        console.log(`🗑️ Collection ${collectionName}: ${result.deletedCount} documents supprimés`)
      } catch (error) {
        console.log(`⚠️ Collection ${collectionName} n'existe pas ou erreur:`, error)
      }
    }

    // Nettoyer GridFS
    try {
      await clearGridFS()
      console.log("🗑️ GridFS nettoyé")
    } catch (error) {
      console.error("❌ Erreur nettoyage GridFS:", error)
    }

    console.log(`✅ Reset terminé: ${deletedCount} documents supprimés`)

    return NextResponse.json({
      success: true,
      message: `Base de données réinitialisée: ${deletedCount} documents supprimés`,
      deletedCount,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique reset:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors du reset",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
