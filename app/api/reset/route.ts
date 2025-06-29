import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { deleteAllFiles } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API /api/reset - Début de la réinitialisation complète")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer toutes les collections
    const collections = ["luminaires", "designers", "settings", "timeline"]

    for (const collectionName of collections) {
      try {
        const result = await db.collection(collectionName).deleteMany({})
        console.log(`✅ Collection ${collectionName}: ${result.deletedCount} documents supprimés`)
      } catch (error) {
        console.log(`⚠️ Collection ${collectionName} n'existe pas ou erreur:`, error)
      }
    }

    // Supprimer tous les fichiers GridFS
    try {
      await deleteAllFiles()
      console.log("✅ Tous les fichiers GridFS supprimés")
    } catch (error) {
      console.error("❌ Erreur suppression GridFS:", error)
    }

    console.log("✅ Réinitialisation complète terminée")

    return NextResponse.json({
      success: true,
      message: "Serveur réinitialisé avec succès",
      deletedCollections: collections,
      deletedFiles: true,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de la réinitialisation:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de la réinitialisation",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
