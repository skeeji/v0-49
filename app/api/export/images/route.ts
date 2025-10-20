import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("📦 Début de l'export de TOUTES les images .jpg depuis le bucket 'uploads'...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    console.log("📊 Phase 1: Collecte des informations depuis la collection luminaires...")
    const luminairesCollection = db.collection("luminaires")
    const allLuminaires = await luminairesCollection.find({}).toArray()
    console.log(`📋 ${allLuminaires.length} luminaires trouvés dans la base de données`)

    const designerImages = new Set<string>()
    const luminaireImages = new Set<string>()

    const designerImageFields = [
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

    allLuminaires.forEach((luminaire, index) => {
      console.log(`🔍 Traitement document ${index + 1}/${allLuminaires.length}`)

      let designerImageFound = false
      for (const fieldName of designerImageFields) {
        const fieldValue = luminaire[fieldName]
        if (fieldValue && typeof fieldValue === "string") {
          const cleanFilename = fieldValue.trim()
          if (cleanFilename !== "" && cleanFilename.toLowerCase().endsWith(".jpg")) {
            designerImages.add(cleanFilename)
            console.log(`  👤 Designer image trouvée via "${fieldName}": ${cleanFilename}`)
            designerImageFound = true
            break
          }
        }
      }

      if (!designerImageFound) {
        Object.keys(luminaire).forEach((key) => {
          const value = luminaire[key]
          if (typeof value === "string" && value.trim() !== "") {
            const cleanValue = value.trim()
            if (
              (key.toLowerCase().includes("designer") ||
                key.toLowerCase().includes("artiste") ||
                key.toLowerCase().includes("image")) &&
              cleanValue.toLowerCase().endsWith(".jpg")
            ) {
              designerImages.add(cleanValue)
              console.log(`  👤 Designer image trouvée via recherche étendue "${key}": ${cleanValue}`)
              designerImageFound = true
            }
          }
        })
      }

      if (luminaire.filename && typeof luminaire.filename === "string") {
        const cleanFilename = luminaire.filename.trim()
        if (cleanFilename !== "" && cleanFilename.toLowerCase().endsWith(".jpg")) {
          luminaireImages.add(cleanFilename)
          console.log(`  💡 Image principale: ${cleanFilename}`)
        }
      }

      if (luminaire["Nom du fichier"] && typeof luminaire["Nom du fichier"] === "string") {
        const cleanFilename = luminaire["Nom du fichier"].trim()
        if (cleanFilename !== "" && cleanFilename.toLowerCase().endsWith(".jpg")) {
          luminaireImages.add(cleanFilename)
          console.log(`  💡 Image CSV "Nom du fichier": ${cleanFilename}`)
        }
      }

      if (Array.isArray(luminaire.images)) {
        luminaire.images.forEach((img: string) => {
          if (img && typeof img === "string") {
            const cleanFilename = img.trim()
            if (cleanFilename !== "" && cleanFilename.toLowerCase().endsWith(".jpg")) {
              luminaireImages.add(cleanFilename)
              console.log(`  🖼️ Image secondaire: ${cleanFilename}`)
            }
          }
        })
      }
    })

    console.log(`📊 Listes de référence créées:`)
    console.log(`  👤 ${designerImages.size} images de designers identifiées`)
    console.log(`  💡 ${luminaireImages.size} images de luminaires identifiées`)

    console.log("📁 Phase 2: Traitement des fichiers depuis GridFS...")
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    const allFiles = await bucket.find({}).toArray()
    const jpgFiles = allFiles.filter((file) => {
      const filename = file.filename || ""
      return filename.toLowerCase().endsWith(".jpg")
    })

    console.log(`📂 ${jpgFiles.length} fichiers .jpg trouvés dans le bucket "uploads"`)

    if (jpgFiles.length === 0) {
      console.log("❌ Aucun fichier .jpg trouvé dans le bucket uploads")
      return NextResponse.json({ error: "Aucune image .jpg trouvée dans le bucket uploads" }, { status: 404 })
    }

    const fileData: Array<{ name: string; data: Buffer; crc32: number }> = []
    let designersCount = 0
    let luminairesCount = 0

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
        const cleanOriginalFilename = originalFilename.trim()

        let zipFilename: string

        const metadata = file.metadata || {}
        if (metadata.isDesignerImage === true || metadata.type === "designer-image") {
          zipFilename = `designers/${cleanOriginalFilename}`
          designersCount++
          console.log(
            `👤 ${cleanOriginalFilename} → designers/ (métadonnées: ${metadata.type || "isDesignerImage=true"})`,
          )
        } else if (designerImages.has(cleanOriginalFilename)) {
          zipFilename = `designers/${cleanOriginalFilename}`
          designersCount++
          console.log(`👤 ${cleanOriginalFilename} → designers/ (trouvé dans la liste de référence)`)
        } else {
          zipFilename = `luminaires/${cleanOriginalFilename}`
          luminairesCount++
          console.log(`💡 ${cleanOriginalFilename} → luminaires/ (défaut)`)
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

    console.log(`📊 Résumé du tri final:`)
    console.log(`  👤 ${designersCount} fichiers dans designers/`)
    console.log(`  💡 ${luminairesCount} fichiers dans luminaires/`)
    console.log(`  📁 ${fileData.length} fichiers au total dans le ZIP`)

    const zipBuffer = createZipBuffer(fileData)

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
    const nameBuffer = Buffer.from(name, "utf8")
    const localHeader = Buffer.alloc(30 + nameBuffer.length)

    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(0, 8)

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
