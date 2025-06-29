import { GridFSBucket } from "mongodb"
import clientPromise from "./mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

let bucket: GridFSBucket | null = null

export async function getBucket(): Promise<GridFSBucket> {
  if (bucket) {
    return bucket
  }

  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    bucket = new GridFSBucket(db, { bucketName: "images" })
    console.log("✅ GridFS bucket initialisé")
    return bucket
  } catch (error) {
    console.error("❌ Erreur initialisation GridFS:", error)
    throw new Error("Impossible d'initialiser GridFS")
  }
}

export async function resetGridFS(): Promise<void> {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer toutes les collections GridFS
    await db.collection("images.files").deleteMany({})
    await db.collection("images.chunks").deleteMany({})

    console.log("✅ GridFS réinitialisé")
  } catch (error) {
    console.error("❌ Erreur réinitialisation GridFS:", error)
    throw error
  }
}
