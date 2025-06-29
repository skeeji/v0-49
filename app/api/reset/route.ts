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
    const collections = await db.listCollections().toArray()
    console.log(`📋 ${collections.length} collections trouvées`)

    for (const collection of collections) {
      await db.collection(collection.name).drop()
      console.log(`🗑️ Collection ${collection.name} supprimée`)
    }

    // 2. Réinitialiser GridFS
    await resetGridFS()

    console.log("✅ Réinitialisation complète terminée")

    return NextResponse.json({
      success: true,
      message: "Serveur réinitialisé avec succès",
      deletedCollections: collections.length,
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
