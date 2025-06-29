import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { clearAllFiles } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API /api/reset - Début de la réinitialisation complète")

    const client = await clientPromise
    const db = client.db(DBNAME)

    const results = {
      luminaires: 0,
      designers: 0,
      settings: 0,
      files: 0,
    }

    // Compter les éléments avant suppression
    const luminairesCount = await db.collection("luminaires").countDocuments()
    const designersCount = await db.collection("designers").countDocuments()
    const settingsCount = await db.collection("settings").countDocuments()

    console.log(
      `📊 Éléments à supprimer: ${luminairesCount} luminaires, ${designersCount} designers, ${settingsCount} settings`,
    )

    // Supprimer toutes les collections
    console.log("🗑️ Suppression des luminaires...")
    const luminairesResult = await db.collection("luminaires").deleteMany({})
    results.luminaires = luminairesResult.deletedCount || 0

    console.log("🗑️ Suppression des designers...")
    const designersResult = await db.collection("designers").deleteMany({})
    results.designers = designersResult.deletedCount || 0

    console.log("🗑️ Suppression des settings...")
    const settingsResult = await db.collection("settings").deleteMany({})
    results.settings = settingsResult.deletedCount || 0

    // Supprimer tous les fichiers GridFS
    console.log("🗑️ Suppression de tous les fichiers GridFS...")
    await clearAllFiles()
    results.files = 1 // Indicateur que les fichiers ont été supprimés

    console.log(
      `✅ Réinitialisation terminée: ${results.luminaires} luminaires, ${results.designers} designers, ${results.settings} settings supprimés`,
    )

    return NextResponse.json({
      success: true,
      message: "Réinitialisation complète terminée avec succès",
      deleted: results,
      details: {
        luminaires: `${results.luminaires} luminaires supprimés`,
        designers: `${results.designers} designers supprimés`,
        settings: `${results.settings} paramètres supprimés`,
        files: "Tous les fichiers GridFS supprimés",
      },
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
