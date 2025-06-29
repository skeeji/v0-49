import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🗑️ API /api/reset - Début de la suppression complète")

    const client = await clientPromise
    const db = client.db(DBNAME)

    let deletedItems = 0
    const results = []

    // Supprimer les collections
    const collections = ["luminaires", "designers", "users"]
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName)
        const result = await collection.deleteMany({})
        deletedItems += result.deletedCount
        results.push(`${collectionName}: ${result.deletedCount} documents supprimés`)
        console.log(`🗑️ Collection ${collectionName}: ${result.deletedCount} documents supprimés`)
      } catch (error) {
        console.log(`⚠️ Collection ${collectionName} non trouvée ou vide`)
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

      results.push(`GridFS: ${files.length} fichiers supprimés`)
      console.log(`🗑️ GridFS: ${files.length} fichiers supprimés`)
    } catch (error) {
      console.log("⚠️ Aucun fichier GridFS à supprimer")
    }

    console.log(`✅ Suppression terminée: ${deletedItems} éléments supprimés`)

    return NextResponse.json({
      success: true,
      message: `Base de données vidée avec succès: ${deletedItems} éléments supprimés`,
      details: results,
      deletedItems,
    })
  } catch (error: any) {
    console.error("❌ Erreur lors du reset:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la suppression",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
