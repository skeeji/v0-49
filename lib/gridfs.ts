import { GridFSBucket, type MongoClient, type ObjectId } from "mongodb"

let gridFSBucket: GridFSBucket | null = null

export async function getGridFSBucket(client: MongoClient, dbName: string): Promise<GridFSBucket> {
  if (!gridFSBucket) {
    const db = client.db(dbName)
    gridFSBucket = new GridFSBucket(db, { bucketName: "uploads" })
  }
  return gridFSBucket
}

export async function uploadFileToGridFS(
  client: MongoClient,
  dbName: string,
  buffer: Buffer,
  filename: string,
  contentType: string,
  metadata: any = {},
): Promise<{ fileId: ObjectId; filename: string; size: number }> {
  try {
    const bucket = await getGridFSBucket(client, dbName)

    // Supprimer l'ancien fichier s'il existe
    try {
      const existingFiles = await bucket.find({ filename }).toArray()
      for (const file of existingFiles) {
        await bucket.delete(file._id)
        console.log(`🗑️ Ancien fichier supprimé: ${filename}`)
      }
    } catch (error) {
      console.log(`⚠️ Aucun ancien fichier à supprimer: ${filename}`)
    }

    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
        contentType,
        metadata: {
          ...metadata,
          uploadDate: new Date(),
        },
      })

      uploadStream.on("error", (error) => {
        console.error(`❌ Erreur upload GridFS: ${filename}`, error)
        reject(error)
      })

      uploadStream.on("finish", () => {
        console.log(`✅ Fichier uploadé: ${filename} (${buffer.length} bytes)`)
        resolve({
          fileId: uploadStream.id as ObjectId,
          filename,
          size: buffer.length,
        })
      })

      uploadStream.end(buffer)
    })
  } catch (error) {
    console.error(`❌ Erreur critique upload GridFS: ${filename}`, error)
    throw error
  }
}

export async function getFileFromGridFS(
  client: MongoClient,
  dbName: string,
  filename: string,
): Promise<{ buffer: Buffer; contentType: string; metadata: any } | null> {
  try {
    const bucket = await getGridFSBucket(client, dbName)

    const files = await bucket.find({ filename }).toArray()
    if (files.length === 0) {
      console.log(`❌ Fichier non trouvé: ${filename}`)
      return null
    }

    const file = files[0]
    console.log(`📁 Fichier trouvé: ${filename} (${file.length} bytes)`)

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const downloadStream = bucket.openDownloadStreamByName(filename)

      downloadStream.on("data", (chunk) => {
        chunks.push(chunk)
      })

      downloadStream.on("error", (error) => {
        console.error(`❌ Erreur téléchargement GridFS: ${filename}`, error)
        reject(error)
      })

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks)
        console.log(`✅ Fichier téléchargé: ${filename} (${buffer.length} bytes)`)
        resolve({
          buffer,
          contentType: file.contentType || "application/octet-stream",
          metadata: file.metadata || {},
        })
      })
    })
  } catch (error) {
    console.error(`❌ Erreur critique téléchargement GridFS: ${filename}`, error)
    return null
  }
}

export async function deleteFileFromGridFS(client: MongoClient, dbName: string, filename: string): Promise<boolean> {
  try {
    const bucket = await getGridFSBucket(client, dbName)

    const files = await bucket.find({ filename }).toArray()
    if (files.length === 0) {
      console.log(`⚠️ Fichier non trouvé pour suppression: ${filename}`)
      return false
    }

    for (const file of files) {
      await bucket.delete(file._id)
      console.log(`🗑️ Fichier supprimé: ${filename}`)
    }

    return true
  } catch (error) {
    console.error(`❌ Erreur suppression GridFS: ${filename}`, error)
    return false
  }
}

export async function listFilesFromGridFS(client: MongoClient, dbName: string, filter: any = {}): Promise<any[]> {
  try {
    const bucket = await getGridFSBucket(client, dbName)
    const files = await bucket.find(filter).toArray()
    console.log(`📋 ${files.length} fichiers trouvés dans GridFS`)
    return files
  } catch (error) {
    console.error("❌ Erreur listage GridFS:", error)
    return []
  }
}
