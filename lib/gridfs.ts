import { GridFSBucket } from "mongodb"
import clientPromise from "./mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

let bucket: GridFSBucket | null = null

export async function getBucket(): Promise<GridFSBucket> {
  if (!bucket) {
    const client = await clientPromise
    const db = client.db(DBNAME)
    bucket = new GridFSBucket(db, { bucketName: "uploads" })
  }
  return bucket
}

export async function resetGridFS(): Promise<void> {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer toutes les collections GridFS
    await db.collection("uploads.files").deleteMany({})
    await db.collection("uploads.chunks").deleteMany({})

    console.log("✅ GridFS réinitialisé")
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation GridFS:", error)
    throw error
  }
}
