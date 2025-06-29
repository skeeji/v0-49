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

export async function uploadToGridFS(file: Buffer, filename: string, contentType: string): Promise<ObjectId> {
  const bucket = await getBucket()

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        contentType,
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

export async function downloadFromGridFS(id: string): Promise<{ stream: any; metadata: any }> {
  const bucket = await getBucket()
  const objectId = new ObjectId(id)

  // Vérifier que le fichier existe
  const files = await bucket.find({ _id: objectId }).toArray()
  if (files.length === 0) {
    throw new Error("Fichier non trouvé")
  }

  const file = files[0]
  const downloadStream = bucket.openDownloadStream(objectId)

  return {
    stream: downloadStream,
    metadata: {
      filename: file.filename,
      contentType: file.metadata?.contentType || "application/octet-stream",
      length: file.length,
    },
  }
}

export async function deleteFromGridFS(id: string): Promise<void> {
  const bucket = await getBucket()
  const objectId = new ObjectId(id)
  await bucket.delete(objectId)
}

export async function listGridFSFiles(): Promise<any[]> {
  const bucket = await getBucket()
  return await bucket.find({}).toArray()
}

export async function clearGridFS(): Promise<void> {
  const bucket = await getBucket()
  const files = await bucket.find({}).toArray()

  for (const file of files) {
    await bucket.delete(file._id)
  }
}
