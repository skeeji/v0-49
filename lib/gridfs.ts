import { GridFSBucket } from "mongodb"
import clientPromise from "./mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

let cachedBucket: GridFSBucket | null = null

export async function getBucket(): Promise<GridFSBucket> {
  if (cachedBucket) {
    return cachedBucket
  }

  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    cachedBucket = new GridFSBucket(db, { bucketName: "uploads" })
    console.log("✅ GridFS bucket initialisé")
    return cachedBucket
  } catch (error) {
    console.error("❌ Erreur initialisation GridFS:", error)
    throw error
  }
}

export async function deleteAllFiles(): Promise<void> {
  try {
    const bucket = await getBucket()
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer tous les fichiers GridFS
    await db.collection("uploads.files").deleteMany({})
    await db.collection("uploads.chunks").deleteMany({})

    console.log("✅ Tous les fichiers GridFS supprimés")
  } catch (error) {
    console.error("❌ Erreur suppression fichiers GridFS:", error)
    throw error
  }
}
