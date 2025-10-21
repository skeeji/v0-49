import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET() {
  console.log("🚀 === DÉBUT EXPORT IMAGES ===")

  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    console.log("✅ Connexion MongoDB établie")

    // 1. Récupérer tous les luminaires pour identifier les images de designers
    console.log("📊 Récupération des luminaires...")
    const luminairesCollection = db.collection("luminaires")
    const allLuminaires = await luminairesCollection.find({}).toArray()
    console.log(`✅ ${allLuminaires.length} luminaires récupérés`)

    const designerImageNames = new Set<string>()

    // Identifier les images de designers
    allLuminaires.forEach((lum) => {
      const designerFields = [
        "designerImageFilename",
        "Image designer (imagedesigner)",
        "imagedesigner",
        "Image designer",
        "designer_image",
        "designerImage",
      ]

      for (const field of designerFields) {
        const value = lum[field]
        if (value && typeof value === "string") {
          const cleanValue = value.trim()
          if (cleanValue) {
            designerImageNames.add(cleanValue)
          }
        }
      }
    })

    console.log(`👤 ${designerImageNames.size} images de designers identifiées`)

    // 2. Récupérer les fichiers depuis GridFS
    console.log("📁 Récupération des fichiers GridFS...")
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const files = await bucket.find({}).toArray()
    console.log(`✅ ${files.length} fichiers trouvés dans GridFS`)

    if (files.length === 0) {
      console.log("⚠️ Aucun fichier trouvé")
      return NextResponse.json({ success: false, error: "Aucune image trouvée" }, { status: 404 })
    }

    // 3. Télécharger et préparer les fichiers
    console.log("💾 Téléchargement des fichiers...")
    const fileData: Array<{ name: string; data: Buffer }> = []
    let designersCount = 0
    let luminairesCount = 0
    let errorCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        console.log(`[${i + 1}/${files.length}] Traitement: ${file.filename}`)

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

        // Déterminer le dossier
        const isDesignerImage = designerImageNames.has(file.filename)
        const folder = isDesignerImage ? "designers" : "luminaires"

        if (isDesignerImage) {
          designersCount++
        } else {
          luminairesCount++
        }

        fileData.push({
          name: `${folder}/${file.filename}`,
          data: buffer,
        })

        console.log(`✅ ${folder}/${file.filename} (${Math.round(buffer.length / 1024)}KB)`)
      } catch (fileError: any) {
        errorCount++
        console.error(`❌ Erreur fichier ${file.filename}:`, fileError.message)
      }
    }

    console.log(`📊 Résumé:`)
    console.log(`  - ${designersCount} designers`)
    console.log(`  - ${luminairesCount} luminaires`)
    console.log(`  - ${errorCount} erreurs`)
    console.log(`  - ${fileData.length} fichiers OK`)

    if (fileData.length === 0) {
      console.log("❌ Aucun fichier valide")
      return NextResponse.json({ success: false, error: "Aucun fichier valide trouvé" }, { status: 404 })
    }

    // 4. Créer le ZIP
    console.log("📦 Création du ZIP...")
    const zipBuffer = createSimpleZip(fileData)
    console.log(`✅ ZIP créé: ${Math.round(zipBuffer.length / 1024)}KB`)

    const filename = `images_export_${new Date().toISOString().split("T")[0]}.zip`

    console.log(`✅ === FIN EXPORT IMAGES ===`)

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error: any) {
    console.error("❌ === ERREUR CRITIQUE ===")
    console.error("Message:", error.message)
    console.error("Stack:", error.stack)

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

function createSimpleZip(files: Array<{ name: string; data: Buffer }>): Buffer {
  const localFiles: Buffer[] = []
  const centralDir: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const filename = Buffer.from(file.name, "utf8")
    const data = file.data

    // CRC32
    const crc = calculateCRC32(data)

    // DOS date/time
    const now = new Date()
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() / 2)
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filename.length)
    localHeader.writeUInt32LE(0x04034b50, 0) // signature
    localHeader.writeUInt16LE(20, 4) // version needed
    localHeader.writeUInt16LE(0, 6) // flags
    localHeader.writeUInt16LE(0, 8) // compression (none)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(data.length, 18) // compressed size
    localHeader.writeUInt32LE(data.length, 22) // uncompressed size
    localHeader.writeUInt16LE(filename.length, 26)
    localHeader.writeUInt16LE(0, 28) // extra field length
    filename.copy(localHeader, 30)

    localFiles.push(localHeader, data)

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + filename.length)
    centralHeader.writeUInt32LE(0x02014b50, 0) // signature
    centralHeader.writeUInt16LE(20, 4) // version made by
    centralHeader.writeUInt16LE(20, 6) // version needed
    centralHeader.writeUInt16LE(0, 8) // flags
    centralHeader.writeUInt16LE(0, 10) // compression
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(filename.length, 28)
    centralHeader.writeUInt16LE(0, 30) // extra field length
    centralHeader.writeUInt16LE(0, 32) // comment length
    centralHeader.writeUInt16LE(0, 34) // disk number
    centralHeader.writeUInt16LE(0, 36) // internal attributes
    centralHeader.writeUInt32LE(0, 38) // external attributes
    centralHeader.writeUInt32LE(offset, 42) // local header offset
    filename.copy(centralHeader, 46)

    centralDir.push(centralHeader)

    offset += localHeader.length + data.length
  }

  const centralDirBuffer = Buffer.concat(centralDir)
  const centralDirSize = centralDirBuffer.length

  // End of central directory (22 bytes)
  const endOfCentralDir = Buffer.alloc(22)
  endOfCentralDir.writeUInt32LE(0x06054b50, 0) // signature
  endOfCentralDir.writeUInt16LE(0, 4) // disk number
  endOfCentralDir.writeUInt16LE(0, 6) // central dir disk
  endOfCentralDir.writeUInt16LE(files.length, 8) // entries on disk
  endOfCentralDir.writeUInt16LE(files.length, 10) // total entries
  endOfCentralDir.writeUInt32LE(centralDirSize, 12)
  endOfCentralDir.writeUInt32LE(offset, 16)
  endOfCentralDir.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...localFiles, centralDirBuffer, endOfCentralDir])
}

function calculateCRC32(buffer: Buffer): number {
  let crc = 0xffffffff

  for (let i = 0; i < buffer.length; i++) {
    crc = crc ^ buffer[i]
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}
