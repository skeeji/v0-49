import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("📦 Début de l'export des images...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Essayer directement GridFS avec le bucket "images"
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    let files: any[] = []
    try {
      files = await bucket.find({}).toArray()
      console.log(`📊 ${files.length} fichiers trouvés dans GridFS bucket "images"`)

      // Afficher les détails des premiers fichiers
      files.slice(0, 5).forEach((file, index) => {
        console.log(`Fichier ${index + 1}:`, {
          filename: file.filename,
          length: file.length,
          contentType: file.contentType,
          uploadDate: file.uploadDate,
        })
      })
    } catch (gridfsError) {
      console.error("❌ Erreur GridFS:", gridfsError)
    }

    if (files.length === 0) {
      // Essayer avec d'autres noms de buckets
      const bucketNames = ["fs", "uploads", "files"]

      for (const bucketName of bucketNames) {
        try {
          const altBucket = new GridFSBucket(db, { bucketName })
          const altFiles = await altBucket.find({}).toArray()
          if (altFiles.length > 0) {
            files = altFiles
            console.log(`📊 ${files.length} fichiers trouvés dans le bucket "${bucketName}"`)
            break
          }
        } catch (error) {
          console.log(`❌ Bucket "${bucketName}" non accessible`)
        }
      }
    }

    if (files.length === 0) {
      console.log("❌ Aucun fichier trouvé dans GridFS")
      return NextResponse.json({ error: "Aucune image trouvée dans GridFS" }, { status: 404 })
    }

    // Traiter tous les fichiers trouvés
    const fileData: Array<{ name: string; data: Buffer; crc32: number }> = []

    for (const file of files) {
      try {
        console.log(`📁 Traitement du fichier: ${file.filename} (${file.length} bytes)`)

        // Vérifier que c'est bien une image
        if (file.contentType && !file.contentType.startsWith("image/")) {
          console.log(`⚠️ Fichier ignoré (pas une image): ${file.filename} - ${file.contentType}`)
          continue
        }

        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }

        const buffer = Buffer.concat(chunks)

        // Vérifier que le buffer n'est pas vide
        if (buffer.length === 0) {
          console.log(`⚠️ Fichier vide ignoré: ${file.filename}`)
          continue
        }

        // Vérifier que c'est bien une image en regardant les premiers bytes
        const isValidImage = isImageBuffer(buffer)
        if (!isValidImage) {
          console.log(`⚠️ Fichier ignoré (pas une image valide): ${file.filename}`)
          continue
        }

        const safeFilename = file.filename || `image_${file._id}.jpg`
        const crc32 = calculateCRC32(buffer)

        fileData.push({
          name: safeFilename,
          data: buffer,
          crc32: crc32,
        })

        console.log(`✅ Image valide ajoutée: ${safeFilename} (${buffer.length} bytes)`)
      } catch (fileError) {
        console.error(`❌ Erreur avec le fichier ${file.filename}:`, fileError)
      }
    }

    if (fileData.length === 0) {
      return NextResponse.json({ error: "Aucune image valide trouvée" }, { status: 404 })
    }

    // Créer le ZIP
    const zipBuffer = createZipBuffer(fileData)

    console.log(`✅ ZIP généré: ${zipBuffer.length} bytes avec ${fileData.length} images`)

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("❌ Erreur lors de l'export des images:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de l'export des images",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}

// Fonction pour vérifier si un buffer contient une image valide
function isImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false

  // Vérifier les signatures de fichiers image
  const header = buffer.subarray(0, 4)

  // JPEG
  if (header[0] === 0xff && header[1] === 0xd8) return true

  // PNG
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) return true

  // GIF
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) return true

  // WebP
  if (buffer.length >= 12) {
    const webpHeader = buffer.subarray(8, 12)
    if (header.toString() === "RIFF" && webpHeader.toString() === "WEBP") return true
  }

  return false
}

function createZipBuffer(fileData: Array<{ name: string; data: Buffer; crc32: number }>): Buffer {
  const zipEntries: Buffer[] = []
  const centralDirectory: Buffer[] = []
  let offset = 0

  fileData.forEach(({ name, data, crc32 }) => {
    // Local file header
    const nameBuffer = Buffer.from(name, "utf8")
    const localHeader = Buffer.alloc(30 + nameBuffer.length)

    localHeader.writeUInt32LE(0x04034b50, 0) // Local file header signature
    localHeader.writeUInt16LE(20, 4) // Version needed to extract
    localHeader.writeUInt16LE(0, 6) // General purpose bit flag
    localHeader.writeUInt16LE(0, 8) // Compression method (stored)

    // Date et heure actuelles
    const now = new Date()
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

    localHeader.writeUInt16LE(dosTime, 10) // Last mod file time
    localHeader.writeUInt16LE(dosDate, 12) // Last mod file date
    localHeader.writeUInt32LE(crc32, 14) // CRC-32
    localHeader.writeUInt32LE(data.length, 18) // Compressed size
    localHeader.writeUInt32LE(data.length, 22) // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26) // File name length
    localHeader.writeUInt16LE(0, 28) // Extra field length
    nameBuffer.copy(localHeader, 30)

    zipEntries.push(localHeader)
    zipEntries.push(data)

    // Central directory entry
    const centralEntry = Buffer.alloc(46 + nameBuffer.length)
    centralEntry.writeUInt32LE(0x02014b50, 0) // Central file header signature
    centralEntry.writeUInt16LE(20, 4) // Version made by
    centralEntry.writeUInt16LE(20, 6) // Version needed to extract
    centralEntry.writeUInt16LE(0, 8) // General purpose bit flag
    centralEntry.writeUInt16LE(0, 10) // Compression method
    centralEntry.writeUInt16LE(dosTime, 12) // Last mod file time
    centralEntry.writeUInt16LE(dosDate, 14) // Last mod file date
    centralEntry.writeUInt32LE(crc32, 16) // CRC-32
    centralEntry.writeUInt32LE(data.length, 20) // Compressed size
    centralEntry.writeUInt32LE(data.length, 24) // Uncompressed size
    centralEntry.writeUInt16LE(nameBuffer.length, 28) // File name length
    centralEntry.writeUInt16LE(0, 30) // Extra field length
    centralEntry.writeUInt16LE(0, 32) // File comment length
    centralEntry.writeUInt16LE(0, 34) // Disk number start
    centralEntry.writeUInt16LE(0, 36) // Internal file attributes
    centralEntry.writeUInt32LE(0, 38) // External file attributes
    centralEntry.writeUInt32LE(offset, 42) // Relative offset of local header
    nameBuffer.copy(centralEntry, 46)

    centralDirectory.push(centralEntry)
    offset += localHeader.length + data.length
  })

  // End of central directory record
  const centralDirSize = centralDirectory.reduce((sum, entry) => sum + entry.length, 0)
  const endOfCentralDir = Buffer.alloc(22)
  endOfCentralDir.writeUInt32LE(0x06054b50, 0) // End of central dir signature
  endOfCentralDir.writeUInt16LE(0, 4) // Number of this disk
  endOfCentralDir.writeUInt16LE(0, 6) // Number of the disk with the start of the central directory
  endOfCentralDir.writeUInt16LE(fileData.length, 8) // Total number of entries in the central directory on this disk
  endOfCentralDir.writeUInt16LE(fileData.length, 10) // Total number of entries in the central directory
  endOfCentralDir.writeUInt32LE(centralDirSize, 12) // Size of the central directory
  endOfCentralDir.writeUInt32LE(offset, 16) // Offset of start of central directory
  endOfCentralDir.writeUInt16LE(0, 20) // ZIP file comment length

  return Buffer.concat([...zipEntries, ...centralDirectory, endOfCentralDir])
}

// Fonction pour calculer le CRC32
function calculateCRC32(buffer: Buffer): number {
  const crcTable: number[] = []
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    crcTable[i] = crc
  }

  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}
