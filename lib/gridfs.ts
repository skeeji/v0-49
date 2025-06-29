import { GridFSBucket, type ObjectId } from "mongodb"
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

export async function uploadToGridFS(buffer: Buffer, filename: string, metadata: any = {}): Promise<ObjectId> {
  try {
    console.log(`📁 Upload vers GridFS: ${filename} (${buffer.length} bytes)`)

    const bucket = await getBucket()

    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          ...metadata,
          uploadDate: new Date(),
        },
      })

      uploadStream.on("error", (error) => {
        console.error(`❌ Erreur upload GridFS ${filename}:`, error)
        reject(error)
      })

      uploadStream.on("finish", () => {
        console.log(`✅ Upload GridFS terminé: ${filename} - ID: ${uploadStream.id}`)
        resolve(uploadStream.id as ObjectId)
      })

      uploadStream.end(buffer)
    })
  } catch (error) {
    console.error(`❌ Erreur critique upload GridFS ${filename}:`, error)
    throw error
  }
}

export async function clearGridFS(): Promise<number> {
  try {
    console.log("🗑️ Suppression de tous les fichiers GridFS...")

    const bucket = await getBucket()

    // Récupérer tous les fichiers
    const files = await bucket.find({}).toArray()
    console.log(`📊 ${files.length} fichiers à supprimer`)

    let deletedCount = 0

    // Supprimer chaque fichier
    for (const file of files) {
      try {
        await bucket.delete(file._id)
        deletedCount++
      } catch (error) {
        console.error(`❌ Erreur suppression fichier ${file.filename}:`, error)
      }
    }

    console.log(`✅ ${deletedCount} fichiers GridFS supprimés`)
    return deletedCount
  } catch (error) {
    console.error("❌ Erreur critique suppression GridFS:", error)
    return 0
  }
}
