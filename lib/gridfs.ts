import { MongoClient, GridFSBucket } from "mongodb"
import clientPromise from "./mongodb"

let bucket: GridFSBucket | null = null

export async function getBucket(): Promise<GridFSBucket> {
  if (!bucket) {
    const client = await clientPromise
    const db = client.db(process.env.MONGO_INITDB_DATABASE || "luminaires")
    bucket = new GridFSBucket(db, { bucketName: "uploads" })
  }
  return bucket
}

export async function uploadFile(filename: string, buffer: Buffer, contentType?: string): Promise<string> {
  const bucket = await getBucket()

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: contentType || "application/octet-stream",
    })

    uploadStream.on("error", reject)
    uploadStream.on("finish", () => {
      resolve(uploadStream.id.toString())
    })

    uploadStream.end(buffer)
  })
}

export async function getFile(fileId: string): Promise<Buffer> {
  const bucket = await getBucket()

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    const downloadStream = bucket.openDownloadStream(new MongoClient.ObjectId(fileId))

    downloadStream.on("data", (chunk) => {
      chunks.push(chunk)
    })

    downloadStream.on("end", () => {
      resolve(Buffer.concat(chunks))
    })

    downloadStream.on("error", reject)
  })
}

export async function deleteFile(fileId: string): Promise<void> {
  const bucket = await getBucket()
  await bucket.delete(new MongoClient.ObjectId(fileId))
}
