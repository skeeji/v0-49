import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getBucket } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🗑️ API POST /api/reset - Début de la réinitialisation")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer toutes les collections
    const collections = ["luminaires", "designers", "timeline_descriptions", "welcome_videos"]

    for (const collectionName of collections) {
      try {
        const result = await db.collection(collectionName).deleteMany({})
        console.log(`✅ Collection '${collectionName}' vidée: ${result.deletedCount} documents supprimés`)
      } catch (error) {
        console.log(`⚠️ Collection '${collectionName}' n'existe pas ou erreur:`, error)
      }
    }

    // Supprimer tous les fichiers GridFS
    try {
      const bucket = await getBucket()
      const files = await bucket.find({}).toArray()

      for (const file of files) {
        await bucket.delete(file._id)
        console.log(`🗑️ Fichier GridFS supprimé: ${file.filename}`)
      }

      console.log(`✅ ${files.length} fichiers GridFS supprimés`)
    } catch (error) {
      console.log("⚠️ Erreur lors de la suppression des fichiers GridFS:", error)
    }

    console.log("✅ Réinitialisation terminée avec succès")

    return NextResponse.json({
      success: true,
      message: "Base de données et fichiers réinitialisés avec succès",
      details: {
        collections: collections.length,
        gridfs: "Tous les fichiers supprimés",
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
