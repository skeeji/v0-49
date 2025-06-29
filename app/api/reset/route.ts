import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🗑️ API /api/reset - Début du reset complet")

    const client = await clientPromise
    const db = client.db(DBNAME)

    let deletedItems = 0

    // Supprimer toutes les collections
    const collections = ["luminaires", "designers", "timeline"]
    for (const collectionName of collections) {
      try {
        const result = await db.collection(collectionName).deleteMany({})
        deletedItems += result.deletedCount
        console.log(`🗑️ Collection ${collectionName}: ${result.deletedCount} documents supprimés`)
      } catch (error) {
        console.log(`⚠️ Collection ${collectionName} n'existe pas ou est déjà vide`)
      }
    }

    // Supprimer tous les fichiers GridFS
    try {
      const bucket = new GridFSBucket(db, { bucketName: "uploads" })
      const files = await bucket.find({}).toArray()

      for (const file of files) {
        await bucket.delete(file._id)
        deletedItems++
      }

      console.log(`🗑️ GridFS: ${files.length} fichiers supprimés`)
    } catch (error) {
      console.log("⚠️ Aucun fichier GridFS à supprimer")
    }

    // Supprimer les collections GridFS
    try {
      await db.collection("uploads.files").deleteMany({})
      await db.collection("uploads.chunks").deleteMany({})
      console.log("🗑️ Collections GridFS vidées")
    } catch (error) {
      console.log("⚠️ Collections GridFS déjà vides")
    }

    console.log(`✅ Reset terminé: ${deletedItems} éléments supprimés au total`)

    return NextResponse.json({
      success: true,
      message: `Base de données complètement vidée: ${deletedItems} éléments supprimés`,
      deletedItems,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique reset:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors du reset",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
