import { GridFSBucket } from "mongodb"
import clientPromise from "./mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

let bucket: GridFSBucket | null = null

export async function getBucket(): Promise<GridFSBucket> {
  try {
    if (!bucket) {
      console.log("🔧 Initialisation du bucket GridFS...")
      const client = await clientPromise
      const db = client.db(DBNAME)
      bucket = new GridFSBucket(db, { bucketName: "uploads" })
      console.log("✅ Bucket GridFS initialisé")
    }
    return bucket
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation du bucket GridFS:", error)
    throw error
  }
}

export async function resetGridFS(): Promise<void> {
  try {
    console.log("🗑️ Début de la réinitialisation GridFS...")
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer les collections GridFS
    const collections = await db.listCollections().toArray()
    const gridfsCollections = collections.filter((col) => col.name.startsWith("uploads."))

    for (const collection of gridfsCollections) {
      await db.collection(collection.name).drop()
      console.log(`🗑️ Collection ${collection.name} supprimée`)
    }

    // Réinitialiser le bucket
    bucket = null
    console.log("✅ GridFS réinitialisé")
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation GridFS:", error)
    throw error
  }
}
