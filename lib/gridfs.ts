import { GridFSBucket } from "mongodb"
import { connectToDatabase } from "./mongodb"

let bucket: GridFSBucket

export async function getBucket(): Promise<GridFSBucket> {
  if (bucket) {
    return bucket
  }

  try {
    const { db } = await connectToDatabase()
    bucket = new GridFSBucket(db, { bucketName: "images" })
    console.log("✅ GridFS bucket initialisé")
    return bucket
  } catch (error) {
    console.error("❌ Erreur initialisation GridFS:", error)
    throw error
  }
}
