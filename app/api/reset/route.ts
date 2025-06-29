import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { resetGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API DELETE /api/reset - Début de la réinitialisation complète")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer toutes les collections
    const collections = ["luminaires", "designers", "videos", "logos"]

    for (const collectionName of collections) {
      try {
        const result = await db.collection(collectionName).deleteMany({})
        console.log(`✅ Collection ${collectionName} vidée: ${result.deletedCount} documents supprimés`)
      } catch (error) {
        console.warn(`⚠️ Erreur lors de la suppression de ${collectionName}:`, error)
      }
    }

    // Réinitialiser GridFS
    try {
      await resetGridFS()
      console.log("✅ GridFS réinitialisé")
    } catch (error) {
      console.warn("⚠️ Erreur lors de la réinitialisation de GridFS:", error)
    }

    console.log("✅ Réinitialisation complète terminée")

    return NextResponse.json({
      success: true,
      message: "Base de données et GridFS réinitialisés avec succès",
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de la réinitialisation:", error)
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
