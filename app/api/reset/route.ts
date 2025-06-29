import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API /api/reset - Début de la réinitialisation complète")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Compter les éléments avant suppression
    const luminairesCount = await db.collection("luminaires").countDocuments()
    const designersCount = await db.collection("designers").countDocuments()
    const settingsCount = await db.collection("settings").countDocuments()

    console.log(
      `📊 Avant suppression: ${luminairesCount} luminaires, ${designersCount} designers, ${settingsCount} settings`,
    )

    // Supprimer toutes les collections
    const luminairesResult = await db.collection("luminaires").deleteMany({})
    const designersResult = await db.collection("designers").deleteMany({})
    const settingsResult = await db.collection("settings").deleteMany({})

    // Supprimer tous les fichiers GridFS (images, vidéos, logos)
    await db.collection("uploads.files").deleteMany({})
    await db.collection("uploads.chunks").deleteMany({})

    console.log("✅ Collections MongoDB supprimées")
    console.log("✅ Fichiers GridFS supprimés")

    const result = {
      success: true,
      message: "Réinitialisation complète terminée avec succès",
      deleted: {
        luminaires: luminairesResult.deletedCount,
        designers: designersResult.deletedCount,
        settings: settingsResult.deletedCount,
        files: "Tous les fichiers GridFS supprimés",
      },
    }

    console.log("✅ Réinitialisation terminée:", result)

    return NextResponse.json(result)
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

export async function POST(request: NextRequest) {
  // Rediriger POST vers DELETE pour compatibilité
  return DELETE(request)
}
