import { GridFSBucket, ObjectId } from "mongodb"
import clientPromise from "./mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

let cachedBucket: GridFSBucket | null = null

export async function getBucket(): Promise<GridFSBucket> {
  if (cachedBucket) {
    return cachedBucket
  }

  const client = await clientPromise
  const db = client.db(DBNAME)
  cachedBucket = new GridFSBucket(db, { bucketName: "uploads" })
  return cachedBucket
}

export async function uploadToGridFS(file: Buffer, filename: string, metadata: any = {}): Promise<ObjectId> {
  const bucket = await getBucket()

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        uploadDate: new Date(),
      },
    })

    uploadStream.on("error", reject)
    uploadStream.on("finish", () => {
      resolve(uploadStream.id as ObjectId)
    })

    uploadStream.end(file)
  })
}

export async function downloadFromGridFS(id: string): Promise<Buffer> {
  const bucket = await getBucket()
  const objectId = new ObjectId(id)

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const downloadStream = bucket.openDownloadStream(objectId)

    downloadStream.on("data", (chunk) => chunks.push(chunk))
    downloadStream.on("error", reject)
    downloadStream.on("end", () => {
      resolve(Buffer.concat(chunks))
    })
  })
}

export async function deleteFromGridFS(id: string): Promise<void> {
  const bucket = await getBucket()
  const objectId = new ObjectId(id)
  await bucket.delete(objectId)
}

export async function getFileInfo(id: string) {
  const bucket = await getBucket()
  const objectId = new ObjectId(id)
  return await bucket.find({ _id: objectId }).next()
}

export async function clearGridFS(): Promise<number> {
  const bucket = await getBucket()
  const files = await bucket.find({}).toArray()

  for (const file of files) {
    await bucket.delete(file._id)
  }

  return files.length
}
