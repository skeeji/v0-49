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

    // Récupérer tous les luminaires pour identifier les images de designers
    const luminairesCollection = db.collection("luminaires")
    const allLuminaires = await luminairesCollection.find({}).toArray()

    const designerImageNames = new Set<string>()

    console.log("📊 Analyse de tous les luminaires pour identifier les images de designers...")

    // Identifier toutes les images de designers
    allLuminaires.forEach((lum) => {
      // Liste exhaustive des champs possibles pour les images de designers
      const designerFields = [
        "designerImageFilename",
        "Image designer (imagedesigner)",
        "imagedesigner",
        "Image designer",
        "designer_image",
        "designerImage",
        "imageDesigner",
        "designer-image",
        "DesignerImage",
        "IMAGEDESIGNER",
      ]

      for (const field of designerFields) {
        const value = lum[field]
        if (value && typeof value === "string") {
          const cleanValue = value.trim()
          if (
            cleanValue &&
            (cleanValue.toLowerCase().endsWith(".jpg") ||
              cleanValue.toLowerCase().endsWith(".jpeg") ||
              cleanValue.toLowerCase().endsWith(".png"))
          ) {
            designerImageNames.add(cleanValue)
          }
        }
      }
    })

    console.log(`👤 ${designerImageNames.size} images de designers identifiées`)
    console.log("Exemples d'images de designers:", Array.from(designerImageNames).slice(0, 5))

    // Récupérer tous les fichiers depuis GridFS
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const files = await bucket.find({}).toArray()

    console.log(`📁 ${files.length} fichiers totaux dans GridFS`)

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune image trouvée" }, { status: 404 })
    }

    // Créer le ZIP manuellement
    const fileData: Array<{ name: string; data: Buffer; crc32: number }> = []
    let designersCount = 0
    let luminairesCount = 0

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
          console.log(`⚠️ Fichier vide: ${file.filename}`)
          continue
        }

        // Déterminer le dossier
        const isDesignerImage = designerImageNames.has(file.filename)
        const folder = isDesignerImage ? "designers" : "luminaires"

        console.log(`${isDesignerImage ? "👤" : "💡"} ${file.filename} → ${folder}/`)

        if (isDesignerImage) {
          designersCount++
        } else {
          luminairesCount++
        }

        const crc32 = calculateCRC32(buffer)

        fileData.push({
          name: `${folder}/${file.filename}`,
          data: buffer,
          crc32: crc32,
        })

        console.log(`✅ ${folder}/${file.filename} (${Math.round(buffer.length / 1024)}KB)`)
      } catch (fileError: any) {
        console.error(`❌ Erreur fichier ${file.filename}:`, fileError.message)
      }
    }

    console.log(`📊 Résumé: ${designersCount} designers, ${luminairesCount} luminaires`)
    console.log(`📁 Structure du ZIP:`)
    console.log(`  - designers/ (${designersCount} fichiers)`)
    console.log(`  - luminaires/ (${luminairesCount} fichiers)`)

    if (fileData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucun fichier valide trouvé" }, { status: 404 })
    }

    // Créer le ZIP
    const zipBuffer = createZipBuffer(fileData)

    const filename = `images_export_${new Date().toISOString().split("T")[0]}.zip`

    console.log(`✅ ZIP créé: ${zipBuffer.length} bytes avec ${fileData.length} fichiers`)

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
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

    localHeader.writeUInt32LE(0x04034b50, 0) // Signature
    localHeader.writeUInt16LE(20, 4) // Version
    localHeader.writeUInt16LE(0, 6) // Flags
    localHeader.writeUInt16LE(0, 8) // Compression (stored)

    const now = new Date()
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(crc32, 14)
    localHeader.writeUInt32LE(data.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)
    nameBuffer.copy(localHeader, 30)

    zipEntries.push(localHeader)
    zipEntries.push(data)

    const centralEntry = Buffer.alloc(46 + nameBuffer.length)
    centralEntry.writeUInt32LE(0x02014b50, 0)
    centralEntry.writeUInt16LE(20, 4)
    centralEntry.writeUInt16LE(20, 6)
    centralEntry.writeUInt16LE(0, 8)
    centralEntry.writeUInt16LE(0, 10)
    centralEntry.writeUInt16LE(dosTime, 12)
    centralEntry.writeUInt16LE(dosDate, 14)
    centralEntry.writeUInt32LE(crc32, 16)
    centralEntry.writeUInt32LE(data.length, 20)
    centralEntry.writeUInt32LE(data.length, 24)
    centralEntry.writeUInt16LE(nameBuffer.length, 28)
    centralEntry.writeUInt16LE(0, 30)
    centralEntry.writeUInt16LE(0, 32)
    centralEntry.writeUInt16LE(0, 34)
    centralEntry.writeUInt16LE(0, 36)
    centralEntry.writeUInt32LE(0, 38)
    centralEntry.writeUInt32LE(offset, 42)
    nameBuffer.copy(centralEntry, 46)

    centralDirectory.push(centralEntry)
    offset += localHeader.length + data.length
  })

  const centralDirSize = centralDirectory.reduce((sum, entry) => sum + entry.length, 0)
  const endOfCentralDir = Buffer.alloc(22)
  endOfCentralDir.writeUInt32LE(0x06054b50, 0)
  endOfCentralDir.writeUInt16LE(0, 4)
  endOfCentralDir.writeUInt16LE(0, 6)
  endOfCentralDir.writeUInt16LE(fileData.length, 8)
  endOfCentralDir.writeUInt16LE(fileData.length, 10)
  endOfCentralDir.writeUInt32LE(centralDirSize, 12)
  endOfCentralDir.writeUInt32LE(offset, 16)
  endOfCentralDir.writeUInt16LE(0, 20)

  return Buffer.concat([...zipEntries, ...centralDirectory, endOfCentralDir])
}

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
