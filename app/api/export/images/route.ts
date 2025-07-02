import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("📦 Début de l'export des images...")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    // Récupérer tous les fichiers
    const files = await bucket.find({}).toArray()
    console.log(`📊 ${files.length} fichiers trouvés dans GridFS`)

    if (files.length === 0) {
      return NextResponse.json({ error: "Aucune image trouvée" }, { status: 404 })
    }

    // Créer un ZIP simple sans dépendances externes
    const fileData: Array<{ name: string; data: Buffer }> = []

    // Traiter chaque fichier
    for (const file of files) {
      try {
        console.log(`📁 Traitement du fichier: ${file.filename}`)

        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }

        const buffer = Buffer.concat(chunks)
        const safeFilename = file.filename || `image_${file._id}.jpg`

        fileData.push({
          name: safeFilename,
          data: buffer,
        })

        console.log(`✅ Fichier traité: ${safeFilename} (${buffer.length} bytes)`)
      } catch (fileError) {
        console.error(`❌ Erreur avec le fichier ${file.filename}:`, fileError)
      }
    }

    if (fileData.length === 0) {
      return NextResponse.json({ error: "Aucune image n'a pu être traitée" }, { status: 500 })
    }

    // Créer un ZIP basique manuellement
    const zipEntries: Buffer[] = []
    const centralDirectory: Buffer[] = []
    let offset = 0

    fileData.forEach(({ name, data }) => {
      // Local file header
      const nameBuffer = Buffer.from(name, "utf8")
      const localHeader = Buffer.alloc(30 + nameBuffer.length)

      localHeader.writeUInt32LE(0x04034b50, 0) // Local file header signature
      localHeader.writeUInt16LE(20, 4) // Version needed to extract
      localHeader.writeUInt16LE(0, 6) // General purpose bit flag
      localHeader.writeUInt16LE(0, 8) // Compression method (stored)
      localHeader.writeUInt16LE(0, 10) // Last mod file time
      localHeader.writeUInt16LE(0, 12) // Last mod file date
      localHeader.writeUInt32LE(0, 14) // CRC-32
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
      centralEntry.writeUInt16LE(0, 12) // Last mod file time
      centralEntry.writeUInt16LE(0, 14) // Last mod file date
      centralEntry.writeUInt32LE(0, 16) // CRC-32
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

    // Combine all parts
    const zipBuffer = Buffer.concat([...zipEntries, ...centralDirectory, endOfCentralDir])

    console.log(`✅ ZIP généré: ${zipBuffer.length} bytes avec ${fileData.length} images`)

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
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
