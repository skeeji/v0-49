import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("📦 Début de l'export de TOUTES les images associées...")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const luminairesCollection = db.collection("luminaires")

    // Étape 1: Récupérer tous les noms de fichiers depuis la collection luminaires
    const luminairesWithImages = await luminairesCollection
      .find(
        {
          $or: [
            { "Nom du fichier": { $exists: true, $ne: "" } },
            { filename: { $exists: true, $ne: "" } },
            { designerImageFilename: { $exists: true, $ne: "" } },
          ],
        },
        {
          projection: { "Nom du fichier": 1, filename: 1, designerImageFilename: 1 },
        },
      )
      .toArray()

    // Étape 2: Créer une liste unique de tous les noms de fichiers
    const filenames = new Set<string>()
    luminairesWithImages.forEach((lum) => {
      if (lum["Nom du fichier"]) filenames.add(lum["Nom du fichier"])
      if (lum.filename) filenames.add(lum.filename)
      if (lum.designerImageFilename) filenames.add(lum.designerImageFilename)
    })

    const uniqueFilenames = Array.from(filenames)
    console.log(`📊 ${uniqueFilenames.length} noms de fichiers uniques à exporter.`)

    if (uniqueFilenames.length === 0) {
      return NextResponse.json({ error: "Aucune image associée trouvée." }, { status: 404 })
    }

    // Étape 3: Télécharger chaque fichier depuis GridFS et préparer pour le ZIP
    const fileData: Array<{ name: string; data: Buffer; crc32: number }> = []
    for (const filename of uniqueFilenames) {
      try {
        const downloadStream = bucket.openDownloadStreamByName(filename)
        const chunks: Buffer[] = []
        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }
        const buffer = Buffer.concat(chunks)
        if (buffer.length > 0) {
          fileData.push({ name: filename, data: buffer, crc32: calculateCRC32(buffer) })
        }
      } catch (e) {
        console.error(`❌ Impossible de télécharger le fichier ${filename} depuis GridFS.`)
      }
    }

    if (fileData.length === 0) {
      return NextResponse.json({ error: "Aucun fichier valide n'a pu être récupéré." }, { status: 404 })
    }

    // Étape 4: Créer et envoyer le ZIP (en utilisant votre fonction existante)
    const zipBuffer = createZipBuffer(fileData)
    const today = new Date().toISOString().split("T")[0]
    const zipFilename = `export_images_completes_${today}.zip`

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    })
  } catch (error) {
    console.error("❌ Erreur critique lors de l'export ZIP:", error)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
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
    localHeader.writeUInt16LE(0, 34) // Disk number start
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
