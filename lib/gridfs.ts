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
    return cachedBucket
  } catch (error) {
    console.error("❌ Erreur création GridFS bucket:", error)
    throw error
  }
}

export async function uploadToGridFS(file: Buffer, filename: string, contentType: string): Promise<string> {
  try {
    const bucket = await getBucket()

    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          contentType,
          uploadDate: new Date(),
        },
      })

      uploadStream.on("error", (error) => {
        console.error("❌ Erreur upload GridFS:", error)
        reject(error)
      })

      uploadStream.on("finish", () => {
        console.log(`✅ Fichier uploadé: ${filename} (ID: ${uploadStream.id})`)
        resolve(uploadStream.id.toString())
      })

      uploadStream.end(file)
    })
  } catch (error) {
    console.error("❌ Erreur uploadToGridFS:", error)
    throw error
  }
}

export async function downloadFromGridFS(fileId: string): Promise<{ stream: any; metadata: any }> {
  try {
    const bucket = await getBucket()
    const objectId = new ObjectId(fileId)

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
        uploadDate: file.uploadDate,
      },
    }
  } catch (error) {
    console.error("❌ Erreur downloadFromGridFS:", error)
    throw error
  }
}

export async function downloadFromGridFSByFilename(filename: string): Promise<{ stream: any; metadata: any }> {
  try {
    const bucket = await getBucket()

    // Chercher le fichier par nom
    const files = await bucket.find({ filename }).toArray()
    if (files.length === 0) {
      throw new Error(`Fichier non trouvé: ${filename}`)
    }

    const file = files[0]
    const downloadStream = bucket.openDownloadStreamByName(filename)

    return {
      stream: downloadStream,
      metadata: {
        filename: file.filename,
        contentType: file.metadata?.contentType || "application/octet-stream",
        length: file.length,
        uploadDate: file.uploadDate,
      },
    }
  } catch (error) {
    console.error("❌ Erreur downloadFromGridFSByFilename:", error)
    throw error
  }
}

export async function deleteFromGridFS(fileId: string): Promise<void> {
  try {
    const bucket = await getBucket()
    const objectId = new ObjectId(fileId)
    await bucket.delete(objectId)
    console.log(`🗑️ Fichier supprimé: ${fileId}`)
  } catch (error) {
    console.error("❌ Erreur deleteFromGridFS:", error)
    throw error
  }
}

export async function clearGridFS(): Promise<void> {
  try {
    const bucket = await getBucket()
    const files = await bucket.find({}).toArray()

    for (const file of files) {
      await bucket.delete(file._id)
    }

    console.log(`🗑️ ${files.length} fichiers supprimés de GridFS`)
  } catch (error) {
    console.error("❌ Erreur clearGridFS:", error)
    throw error
  }
}
