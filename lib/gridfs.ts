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

export async function uploadFile(file: Buffer, filename: string, metadata: any = {}): Promise<ObjectId> {
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
      console.log(`✅ Fichier uploadé: ${filename} (ID: ${uploadStream.id})`)
      resolve(uploadStream.id as ObjectId)
    })

    uploadStream.end(file)
  })
}

export async function downloadFile(id: string | ObjectId): Promise<Buffer> {
  const bucket = await getBucket()
  const objectId = typeof id === "string" ? new ObjectId(id) : id

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

export async function deleteFile(id: string | ObjectId): Promise<void> {
  const bucket = await getBucket()
  const objectId = typeof id === "string" ? new ObjectId(id) : id

  try {
    await bucket.delete(objectId)
    console.log(`🗑️ Fichier supprimé: ${objectId}`)
  } catch (error) {
    console.error(`❌ Erreur suppression fichier ${objectId}:`, error)
    throw error
  }
}

export async function getFileInfo(id: string | ObjectId) {
  const bucket = await getBucket()
  const objectId = typeof id === "string" ? new ObjectId(id) : id

  const files = await bucket.find({ _id: objectId }).toArray()
  return files[0] || null
}

export async function findFileByName(filename: string) {
  const bucket = await getBucket()
  const files = await bucket.find({ filename }).toArray()
  return files[0] || null
}

export async function streamFile(id: string | ObjectId) {
  const bucket = await getBucket()
  const objectId = typeof id === "string" ? new ObjectId(id) : id
  return bucket.openDownloadStream(objectId)
}

export async function deleteAllFiles(): Promise<void> {
  const bucket = await getBucket()
  const files = await bucket.find({}).toArray()

  for (const file of files) {
    try {
      await bucket.delete(file._id)
      console.log(`🗑️ Fichier supprimé: ${file.filename}`)
    } catch (error) {
      console.error(`❌ Erreur suppression ${file.filename}:`, error)
    }
  }

  console.log(`✅ ${files.length} fichiers supprimés de GridFS`)
}
