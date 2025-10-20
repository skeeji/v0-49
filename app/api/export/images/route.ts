import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export const maxDuration = 300 // 5 minutes max

export async function GET() {
  try {
    console.log("📦 Début export images avec séparation designers/luminaires")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // PHASE 1: Identifier les images de designers depuis la base de données
    console.log("📊 Phase 1: Identification des images de designers")
    const luminairesCollection = db.collection("luminaires")
    const allLuminaires = await luminairesCollection.find({}).toArray()

    const designerImageNames = new Set<string>()

    // Liste exhaustive des champs possibles pour les images de designers
    const designerImageFields = [
      "designerImageFilename",
      "Image designer (imagedesigner)",
      "imagedesigner",
      "Image designer",
      "designer_image",
      "designerImage",
      "imageDesigner",
      "designer-image",
    ]

    allLuminaires.forEach((lum) => {
      for (const field of designerImageFields) {
        const value = lum[field]
        if (value && typeof value === "string") {
          const cleanValue = value.trim()
          if (cleanValue && cleanValue.toLowerCase().endsWith(".jpg")) {
            designerImageNames.add(cleanValue)
          }
        }
      }
    })

    console.log(`👤 ${designerImageNames.size} images de designers identifiées`)

    // PHASE 2: Récupérer tous les fichiers depuis GridFS
    console.log("📁 Phase 2: Récupération des fichiers depuis GridFS")
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const files = await bucket.find({}).toArray()

    console.log(`📁 ${files.length} fichiers totaux dans GridFS`)

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune image trouvée" }, { status: 404 })
    }

    // PHASE 3: Créer le ZIP avec séparation designers/luminaires
    console.log("🗜️ Phase 3: Création du ZIP")
    const fileData: Array<{ name: string; data: Buffer; crc32: number }> = []
    let designersCount = 0
    let luminairesCount = 0
    let errorsCount = 0

    for (const file of files) {
      try {
        // Lire le fichier depuis GridFS
        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }

        const buffer = Buffer.concat(chunks)

        if (buffer.length === 0) {
          console.log(`⚠️ Fichier vide ignoré: ${file.filename}`)
          continue
        }

        // Déterminer le dossier (designers ou luminaires)
        const isDesignerImage = designerImageNames.has(file.filename)
        const folder = isDesignerImage ? "designers" : "luminaires"

        if (isDesignerImage) {
          designersCount++
          console.log(`👤 ${file.filename} → designers/ (${Math.round(buffer.length / 1024)}KB)`)
        } else {
          luminairesCount++
          console.log(`💡 ${file.filename} → luminaires/ (${Math.round(buffer.length / 1024)}KB)`)
        }

        const crc32 = calculateCRC32(buffer)

        fileData.push({
          name: `${folder}/${file.filename}`,
          data: buffer,
          crc32: crc32,
        })
      } catch (fileError: any) {
        errorsCount++
        console.error(`❌ Erreur lecture fichier ${file.filename}:`, fileError.message)
      }
    }

    console.log(`📊 Résumé:`)
    console.log(`  👤 ${designersCount} images dans designers/`)
    console.log(`  💡 ${luminairesCount} images dans luminaires/`)
    console.log(`  ❌ ${errorsCount} erreurs`)
    console.log(`  ✅ ${fileData.length} fichiers au total`)

    if (fileData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucun fichier valide trouvé" }, { status: 404 })
    }

    // PHASE 4: Créer le buffer ZIP
    console.log("📦 Phase 4: Création du buffer ZIP")
    const zipBuffer = createZipBuffer(fileData)

    const today = new Date().toISOString().split("T")[0]
    const filename = `images_export_${today}.zip`

    console.log(`✅ ZIP créé: ${Math.round(zipBuffer.length / 1024 / 1024)}MB avec ${fileData.length} fichiers`)

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur export images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

function createZipBuffer(fileData: Array<{ name: string; data: Buffer; crc32: number }>): Buffer {
  const zipEntries: Buffer[] = []
  const centralDirectory: Buffer[] = []
  let offset = 0

  fileData.forEach(({ name, data, crc32 }) => {
    const nameBuffer = Buffer.from(name, "utf8")
    const localHeader = Buffer.alloc(30 + nameBuffer.length)

    // Local file header signature
    localHeader.writeUInt32LE(0x04034b50, 0)
    // Version needed to extract
    localHeader.writeUInt16LE(20, 4)
    // General purpose bit flag
    localHeader.writeUInt16LE(0, 6)
    // Compression method (0 = stored, no compression)
    localHeader.writeUInt16LE(0, 8)

    // Date et heure actuelles en format DOS
    const now = new Date()
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(crc32, 14)
    localHeader.writeUInt32LE(data.length, 18) // Compressed size
    localHeader.writeUInt32LE(data.length, 22) // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28) // Extra field length
    nameBuffer.copy(localHeader, 30)

    zipEntries.push(localHeader)
    zipEntries.push(data)

    // Central directory file header
    const centralEntry = Buffer.alloc(46 + nameBuffer.length)
    centralEntry.writeUInt32LE(0x02014b50, 0) // Signature
    centralEntry.writeUInt16LE(20, 4) // Version made by
    centralEntry.writeUInt16LE(20, 6) // Version needed to extract
    centralEntry.writeUInt16LE(0, 8) // General purpose bit flag
    centralEntry.writeUInt16LE(0, 10) // Compression method
    centralEntry.writeUInt16LE(dosTime, 12)
    centralEntry.writeUInt16LE(dosDate, 14)
    centralEntry.writeUInt32LE(crc32, 16)
    centralEntry.writeUInt32LE(data.length, 20) // Compressed size
    centralEntry.writeUInt32LE(data.length, 24) // Uncompressed size
    centralEntry.writeUInt16LE(nameBuffer.length, 28)
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
  endOfCentralDir.writeUInt32LE(0x06054b50, 0) // Signature
  endOfCentralDir.writeUInt16LE(0, 4) // Number of this disk
  endOfCentralDir.writeUInt16LE(0, 6) // Disk where central directory starts
  endOfCentralDir.writeUInt16LE(fileData.length, 8) // Number of central directory records on this disk
  endOfCentralDir.writeUInt16LE(fileData.length, 10) // Total number of central directory records
  endOfCentralDir.writeUInt32LE(centralDirSize, 12) // Size of central directory
  endOfCentralDir.writeUInt32LE(offset, 16) // Offset of start of central directory
  endOfCentralDir.writeUInt16LE(0, 20) // ZIP file comment length

  return Buffer.concat([...zipEntries, ...centralDirectory, endOfCentralDir])
}

function calculateCRC32(buffer: Buffer): number {
  // Créer la table CRC32
  const crcTable: number[] = []
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    crcTable[i] = crc
  }

  // Calculer le CRC32
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}
