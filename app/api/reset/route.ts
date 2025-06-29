import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { clearGridFS } from "@/lib/gridfs"

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
    await db.collection("luminaires").deleteMany({})
    await db.collection("designers").deleteMany({})
    await db.collection("settings").deleteMany({})

    console.log("✅ Collections MongoDB supprimées")

    // Supprimer tous les fichiers GridFS
    const gridfsCount = await clearGridFS()
    console.log(`✅ ${gridfsCount} fichiers GridFS supprimés`)

    const result = {
      success: true,
      message: "Réinitialisation complète terminée",
      deleted: {
        luminaires: luminairesCount,
        designers: designersCount,
        settings: settingsCount,
        files: gridfsCount,
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
