import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("📦 Début de l'export des images...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer directement depuis GridFS avec le même code que l'API images
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    // Récupérer TOUS les fichiers
    const files = await bucket.find({}).toArray()
    console.log(`📊 ${files.length} fichiers trouvés dans GridFS`)

    if (files.length === 0) {
      return NextResponse.json({ error: "Aucune image trouvée dans GridFS" }, { status: 404 })
    }

    const fileData: Array<{ name: string; data: Buffer; crc32: number }> = []

    // Traiter TOUS les fichiers un par un
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        console.log(`📁 Traitement ${i + 1}/${files.length}: ${file.filename}`)

        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        // Récupérer tous les chunks
        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }

        const buffer = Buffer.concat(chunks)

        // Vérifier que le buffer n'est pas vide
        if (buffer.length === 0) {
          console.log(`⚠️ Fichier vide ignoré: ${file.filename}`)
          continue
        }

        const safeFilename = file.filename || `image_${file._id}.jpg`
        const crc32 = calculateCRC32(buffer)

        fileData.push({
          name: safeFilename,
          data: buffer,
          crc32: crc32,
        })

        console.log(`✅ Fichier traité: ${safeFilename} (${buffer.length} bytes)`)

        // Limiter à 100 images pour éviter les timeouts
        if (fileData.length >= 100) {
          console.log("🔄 Limitation à 100 images pour éviter les timeouts")
          break
        }
      } catch (fileError) {
        console.error(`❌ Erreur avec le fichier ${file.filename}:`, fileError)
        continue
      }
    }

    if (fileData.length === 0) {
      return NextResponse.json({ error: "Aucune image valide n'a pu être traitée" }, { status: 500 })
    }

    console.log(`🎯 Création du ZIP avec ${fileData.length} images`)

    // Créer le ZIP manuellement
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

      // Date et heure actuelles en format DOS
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

    // Combiner toutes les parties
    const zipBuffer = Buffer.concat([...zipEntries, ...centralDirectory, endOfCentralDir])

    console.log(`✅ ZIP généré avec succès: ${zipBuffer.length} bytes, ${fileData.length} images`)

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="luminaires_images_${new Date().toISOString().split("T")[0]}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("❌ Erreur critique lors de l'export des images:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de l'export des images",
        details: error instanceof Error ? error.message : "Erreur inconnue",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

// Fonction pour calculer le CRC32
function calculateCRC32(buffer: Buffer): number {
  const crcTable: number[] = []

  // Générer la table CRC32
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    crcTable[i] = crc
  }

  // Calculer le CRC32 du buffer
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}
