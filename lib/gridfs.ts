import { GridFSBucket, ObjectId } from "mongodb"
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

export async function uploadToGridFS(
  file: Buffer | Uint8Array,
  filename: string,
  metadata: any = {},
): Promise<ObjectId> {
  try {
    const bucket = await getBucket()

    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          ...metadata,
          uploadDate: new Date(),
          originalName: filename,
        },
      })

      uploadStream.on("error", (error) => {
        console.error("❌ Erreur upload GridFS:", error)
        reject(error)
      })

      uploadStream.on("finish", () => {
        console.log(`✅ Fichier uploadé: ${filename} (ID: ${uploadStream.id})`)
        resolve(uploadStream.id as ObjectId)
      })

      uploadStream.end(file)
    })
  } catch (error) {
    console.error("❌ Erreur uploadToGridFS:", error)
    throw error
  }
}

export async function downloadFromGridFS(fileId: string | ObjectId): Promise<Buffer> {
  try {
    const bucket = await getBucket()
    const objectId = typeof fileId === "string" ? new ObjectId(fileId) : fileId

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const downloadStream = bucket.openDownloadStream(objectId)

      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("error", (error) => {
        console.error("❌ Erreur download GridFS:", error)
        reject(error)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        console.log(`✅ Fichier téléchargé: ${fileId} (${buffer.length} bytes)`)
        resolve(buffer)
      })
    })
  } catch (error) {
    console.error("❌ Erreur downloadFromGridFS:", error)
    throw error
  }
}

export async function deleteFromGridFS(fileId: string | ObjectId): Promise<void> {
  try {
    const bucket = await getBucket()
    const objectId = typeof fileId === "string" ? new ObjectId(fileId) : fileId

    await bucket.delete(objectId)
    console.log(`✅ Fichier supprimé: ${fileId}`)
  } catch (error) {
    console.error("❌ Erreur deleteFromGridFS:", error)
    throw error
  }
}

export async function getFileInfo(fileId: string | ObjectId) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const objectId = typeof fileId === "string" ? new ObjectId(fileId) : fileId

    const fileInfo = await db.collection("uploads.files").findOne({ _id: objectId })
    return fileInfo
  } catch (error) {
    console.error("❌ Erreur getFileInfo:", error)
    throw error
  }
}

export async function streamFile(fileId: string | ObjectId) {
  try {
    const bucket = await getBucket()
    const objectId = typeof fileId === "string" ? new ObjectId(fileId) : fileId

    return bucket.openDownloadStream(objectId)
  } catch (error) {
    console.error("❌ Erreur streamFile:", error)
    throw error
  }
}

export async function findFileByName(filename: string) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    const fileInfo = await db.collection("uploads.files").findOne({ filename })
    return fileInfo
  } catch (error) {
    console.error("❌ Erreur findFileByName:", error)
    throw error
  }
}

export async function clearAllFiles(): Promise<void> {
  try {
    const bucket = await getBucket()
    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer tous les fichiers
    await db.collection("uploads.files").deleteMany({})
    await db.collection("uploads.chunks").deleteMany({})

    console.log("✅ Tous les fichiers GridFS supprimés")
  } catch (error) {
    console.error("❌ Erreur clearAllFiles:", error)
    throw error
  }
}
