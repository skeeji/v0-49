import { GridFSBucket, type MongoClient } from "mongodb"
import clientPromise from "./mongodb"

let gridFSBucket: GridFSBucket | null = null

export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (!gridFSBucket) {
    const client: MongoClient = await clientPromise
    const db = client.db("luminaires")
    gridFSBucket = new GridFSBucket(db, { bucketName: "images" })
  }
  return gridFSBucket
}
