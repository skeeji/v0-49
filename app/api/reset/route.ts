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

    // 1. Supprimer toutes les collections
    const collections = ["luminaires", "designers", "users", "favorites"]
    for (const collectionName of collections) {
      try {
        const result = await db.collection(collectionName).deleteMany({})
        deletedItems += result.deletedCount
        console.log(`🗑️ Collection ${collectionName}: ${result.deletedCount} documents supprimés`)
      } catch (error) {
        console.log(`⚠️ Collection ${collectionName} n'existe pas ou est déjà vide`)
      }
    }

    // 2. Supprimer tous les fichiers GridFS
    try {
      const bucket = new GridFSBucket(db, { bucketName: "uploads" })
      const files = await bucket.find({}).toArray()

      for (const file of files) {
        await bucket.delete(file._id)
      }

      console.log(`🗑️ GridFS: ${files.length} fichiers supprimés`)
      deletedItems += files.length
    } catch (error) {
      console.log("⚠️ Aucun fichier GridFS à supprimer")
    }

    // 3. Supprimer les collections GridFS
    try {
      await db.collection("uploads.files").drop()
      await db.collection("uploads.chunks").drop()
      console.log("🗑️ Collections GridFS supprimées")
    } catch (error) {
      console.log("⚠️ Collections GridFS déjà supprimées")
    }

    console.log(`✅ Reset terminé: ${deletedItems} éléments supprimés au total`)

    return NextResponse.json({
      success: true,
      message: `Base de données complètement vidée: ${deletedItems} éléments supprimés`,
      deletedItems,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors du reset:", error)
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
