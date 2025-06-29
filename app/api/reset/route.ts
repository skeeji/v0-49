import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🗑️ API /api/reset - Début de la réinitialisation complète")

    const client = await clientPromise
    const db = client.db(DBNAME)

    const results = {
      luminaires: 0,
      designers: 0,
      images: 0,
      videos: 0,
      logos: 0,
      gridfsFiles: 0,
    }

    // Supprimer toutes les collections
    try {
      const luminairesResult = await db.collection("luminaires").deleteMany({})
      results.luminaires = luminairesResult.deletedCount
      console.log(`🗑️ ${results.luminaires} luminaires supprimés`)
    } catch (error) {
      console.log("⚠️ Collection luminaires vide ou inexistante")
    }

    try {
      const designersResult = await db.collection("designers").deleteMany({})
      results.designers = designersResult.deletedCount
      console.log(`🗑️ ${results.designers} designers supprimés`)
    } catch (error) {
      console.log("⚠️ Collection designers vide ou inexistante")
    }

    // Supprimer tous les fichiers GridFS (images, vidéos, logos)
    try {
      const bucket = new GridFSBucket(db, { bucketName: "uploads" })
      const files = await bucket.find({}).toArray()

      for (const file of files) {
        await bucket.delete(file._id)
        results.gridfsFiles++
      }
      console.log(`🗑️ ${results.gridfsFiles} fichiers GridFS supprimés`)
    } catch (error) {
      console.log("⚠️ GridFS vide ou inexistant")
    }

    // Supprimer les collections GridFS manuellement si nécessaire
    try {
      await db.collection("uploads.files").deleteMany({})
      await db.collection("uploads.chunks").deleteMany({})
      console.log("🗑️ Collections GridFS nettoyées")
    } catch (error) {
      console.log("⚠️ Collections GridFS déjà vides")
    }

    console.log("✅ Réinitialisation complète terminée - TOUS LES FICHIERS SUPPRIMÉS")

    return NextResponse.json({
      success: true,
      message: "Réinitialisation complète terminée avec succès - Toutes les données et fichiers ont été supprimés",
      deleted: results,
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

export async function DELETE(request: NextRequest) {
  return POST(request)
}
