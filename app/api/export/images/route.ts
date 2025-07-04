import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("📦 Début de l'export de TOUTES les images .jpg depuis le bucket 'uploads'...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Utiliser le bucket GridFS "uploads"
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Récupérer TOUS les luminaires pour identifier les images
    const luminairesCollection = db.collection("luminaires")
    const luminaires = await luminairesCollection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires trouvés pour classification des images`)

    // Récupérer TOUS les fichiers .jpg du bucket
    const allFiles = await bucket.find({}).toArray()
    const jpgFiles = allFiles.filter((file) => {
      const filename = file.filename || ""
      return filename.toLowerCase().endsWith(".jpg")
    })

    console.log(`📊 ${jpgFiles.length} fichiers .jpg trouvés dans le bucket "uploads"`)

    if (jpgFiles.length === 0) {
      console.log("❌ Aucun fichier .jpg trouvé dans le bucket uploads")
      return NextResponse.json({ error: "Aucune image .jpg trouvée dans le bucket uploads" }, { status: 404 })
    }

    // Identifier les images de designers et de luminaires
    const designerImages = new Set<string>()
    const luminaireImages = new Set<string>()

    // Parcourir tous les luminaires pour identifier les images
    luminaires.forEach((luminaire) => {
      // Images principales du luminaire
      if (luminaire.filename) {
        luminaireImages.add(luminaire.filename)
      }
      if (luminaire.images && Array.isArray(luminaire.images)) {
        luminaire.images.forEach((img: string) => {
          luminaireImages.add(img)
        })
      }

      // Images de designers - tous les champs possibles
      const possibleDesignerImageFields = [
        luminaire.designerImageFilename,
        luminaire.designerImage,
        luminaire["Image Designer"],
        luminaire["designer.jpg"],
        luminaire.image_designer,
        luminaire.designer_img,
        luminaire.imgDesigner,
        luminaire.designerImg,
        luminaire.designerPhoto,
        luminaire.photoDesigner,
      ]

      possibleDesignerImageFields.forEach((fieldName) => {
        if (fieldName && typeof fieldName === "string") {
          designerImages.add(fieldName)
        }
      })

      // Recherche par nom de designer
      if (luminaire.designer) {
        const designerName = luminaire.designer.toLowerCase().replace(/\s+/g, "_")
        const possibleDesignerFiles = [
          `${designerName}.jpg`,
          `${luminaire.designer}.jpg`,
          `designer_${designerName}.jpg`,
          `${luminaire.designer.replace(/\s+/g, "")}.jpg`,
          `${luminaire.designer.toLowerCase()}.jpg`,
          `${luminaire.designer.toUpperCase()}.jpg`,
        ]

        possibleDesignerFiles.forEach((possibleFile) => {
          const fileExists = jpgFiles.some((file) => file.filename === possibleFile)
          if (fileExists) {
            designerImages.add(possibleFile)
          }
        })
      }
    })

    console.log(`📋 ${designerImages.size} images de designers identifiées`)
    console.log(`📋 ${luminaireImages.size} images de luminaires identifiées`)

    // Traiter TOUS les fichiers .jpg avec organisation en dossiers
    const fileData: Array<{ name: string; data: Buffer; crc32: number }> = []

    for (const file of jpgFiles) {
      try {
        console.log(`📁 Traitement du fichier: ${file.filename} (${file.length} bytes)`)

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

        const originalFilename = file.filename || `image_${file._id}.jpg`

        // Organisation en dossiers dans le ZIP
        let zipFilename: string
        if (designerImages.has(originalFilename)) {
          zipFilename = `designers/${originalFilename}`
          console.log(`👨‍🎨 Image designer: ${zipFilename}`)
        } else {
          zipFilename = `luminaires/${originalFilename}`
          console.log(`💡 Image luminaire: ${zipFilename}`)
        }

        const crc32 = calculateCRC32(buffer)

        fileData.push({
          name: zipFilename,
          data: buffer,
          crc32: crc32,
        })

        console.log(`✅ Fichier ajouté: ${zipFilename} (${buffer.length} bytes)`)
      } catch (fileError) {
        console.error(`❌ Erreur avec le fichier ${file.filename}:`, fileError)
      }
    }

    if (fileData.length === 0) {
      return NextResponse.json({ error: "Aucun fichier .jpg valide trouvé" }, { status: 404 })
    }

    // Créer le ZIP
    const zipBuffer = createZipBuffer(fileData)

    // Générer le nom du fichier avec la date actuelle
    const today = new Date().toISOString().split("T")[0]
    const filename = `toutes_images_jpg_${today}.zip`

    console.log(
      `✅ ZIP créé: ${zipBuffer.length} bytes avec ${fileData.length} images (dossiers: designers/ + luminaires/)`,
    )

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
