import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { resetGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API /api/reset - Début de la réinitialisation complète")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // 1. Supprimer toutes les collections MongoDB
    const collections = ["luminaires", "designers", "videos", "logos", "settings"]

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName)
        const deleteResult = await collection.deleteMany({})
        console.log(`🗑️ Collection ${collectionName}: ${deleteResult.deletedCount} documents supprimés`)
      } catch (error) {
        console.warn(`⚠️ Erreur suppression collection ${collectionName}:`, error)
      }
    }

    // 2. Réinitialiser GridFS
    try {
      await resetGridFS()
      console.log("🗑️ GridFS réinitialisé")
    } catch (error) {
      console.warn("⚠️ Erreur réinitialisation GridFS:", error)
    }

    // 3. Supprimer les index (optionnel)
    try {
      await db.collection("luminaires").dropIndexes()
      await db.collection("designers").dropIndexes()
      console.log("🗑️ Index supprimés")
    } catch (error) {
      console.warn("⚠️ Erreur suppression index:", error)
    }

    console.log("✅ Réinitialisation complète terminée")

    return NextResponse.json({
      success: true,
      message: "Serveur réinitialisé avec succès",
      details: {
        collections: collections.length,
        gridfs: "réinitialisé",
        indexes: "supprimés",
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur lors de la réinitialisation:", error)
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
