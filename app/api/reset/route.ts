import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { deleteAllFiles } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ === DÉBUT RÉINITIALISATION COMPLÈTE ===")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // 1. Supprimer toutes les collections MongoDB
    console.log("🗑️ Suppression des collections MongoDB...")

    const collections = await db.listCollections().toArray()
    console.log(`📊 ${collections.length} collections trouvées`)

    for (const collection of collections) {
      if (!collection.name.startsWith("system.")) {
        await db.collection(collection.name).deleteMany({})
        console.log(`✅ Collection ${collection.name} vidée`)
      }
    }

    // 2. Supprimer tous les fichiers GridFS
    console.log("🗑️ Suppression des fichiers GridFS...")
    await deleteAllFiles()

    // 3. Réinitialiser les index si nécessaire
    console.log("🔄 Recréation des index...")

    // Index pour les luminaires
    await db.collection("luminaires").createIndex({ nom: 1 })
    await db.collection("luminaires").createIndex({ designer: 1 })
    await db.collection("luminaires").createIndex({ annee: 1 })
    await db.collection("luminaires").createIndex({ periode: 1 })
    await db.collection("luminaires").createIndex({ filename: 1 })

    // Index pour les designers
    await db.collection("designers").createIndex({ Nom: 1 })
    await db.collection("designers").createIndex({ slug: 1 })

    console.log("✅ Index recréés")

    console.log("✅ === RÉINITIALISATION TERMINÉE ===")

    return NextResponse.json({
      success: true,
      message: "Serveur réinitialisé avec succès",
      details: {
        collectionsCleared: collections.length,
        gridfsCleared: true,
        indexesRecreated: true,
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
