import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  console.log("🚀 Début export images")

  const encoder = new TextEncoder()
  let hasError = false
  let errorMessage = ""

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = await clientPromise
        const db = client.db(DBNAME)

        // Récupérer les luminaires pour identifier les images designers
        const luminairesCollection = db.collection("luminaires")
        const allLuminaires = await luminairesCollection.find({}).toArray()

        const designerImageNames = new Set<string>()
        allLuminaires.forEach((lum) => {
          const fields = [
            "designerImageFilename",
            "Image designer (imagedesigner)",
            "imagedesigner",
            "Image designer",
            "designer_image",
            "designerImage",
          ]

          for (const field of fields) {
            const value = lum[field]
            if (value && typeof value === "string" && value.trim()) {
              designerImageNames.add(value.trim())
            }
          }
        })

        console.log(`👤 ${designerImageNames.size} images designers identifiées`)

        // Récupérer les fichiers
        const bucket = new GridFSBucket(db, { bucketName: "uploads" })
        const files = await bucket.find({}).toArray()

        console.log(`📁 ${files.length} fichiers trouvés`)

        if (files.length === 0) {
          hasError = true
          errorMessage = "Aucune image trouvée"
          controller.close()
          return
        }

        // Préparer les données du ZIP
        const zipData: Array<{ name: string; data: Buffer }> = []

        for (let i = 0; i < files.length; i++) {
          const file = files[i]

          try {
            const downloadStream = bucket.openDownloadStream(file._id)
            const chunks: Buffer[] = []

            for await (const chunk of downloadStream) {
              chunks.push(chunk)
            }

            const buffer = Buffer.concat(chunks)

            if (buffer.length === 0) {
              continue
            }

            const isDesigner = designerImageNames.has(file.filename)
            const folder = isDesigner ? "designers" : "luminaires"

            zipData.push({
              name: `${folder}/${file.filename}`,
              data: buffer,
            })

            console.log(`✅ [${i + 1}/${files.length}] ${folder}/${file.filename}`)
          } catch (err) {
            console.error(`❌ Erreur fichier ${file.filename}:`, err)
          }
        }

        console.log(`📦 ${zipData.length} fichiers à zipper`)

        // Créer le ZIP
        const zipBuffer = createZipFile(zipData)

        console.log(`✅ ZIP créé: ${Math.round(zipBuffer.length / 1024 / 1024)}MB`)

        // Envoyer le ZIP
        controller.enqueue(zipBuffer)
        controller.close()
      } catch (error: any) {
        console.error("❌ Erreur:", error)
        hasError = true
        errorMessage = error.message
        controller.close()
      }
    },
  })

  if (hasError) {
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }

  const filename = `images_export_${new Date().toISOString().split("T")[0]}.zip`

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    },
  })
}

function createZipFile(files: Array<{ name: string; data: Buffer }>): Buffer {
  const parts: Buffer[] = []
  const centralDirectory: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, "utf8")
    const data = file.data
    const crc = getCRC32(data)
    const now = new Date()

    // DOS time/date
    const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff
    const date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBytes.length)
    localHeader.writeUInt32LE(0x04034b50, 0) // Signature
    localHeader.writeUInt16LE(20, 4) // Version
    localHeader.writeUInt16LE(0, 6) // Flags
    localHeader.writeUInt16LE(0, 8) // No compression
    localHeader.writeUInt16LE(time, 10)
    localHeader.writeUInt16LE(date, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(data.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(nameBytes.length, 26)
    localHeader.writeUInt16LE(0, 28)
    nameBytes.copy(localHeader, 30)

    parts.push(localHeader)
    parts.push(data)

    // Central directory entry
    const centralEntry = Buffer.alloc(46 + nameBytes.length)
    centralEntry.writeUInt32LE(0x02014b50, 0)
    centralEntry.writeUInt16LE(20, 4)
    centralEntry.writeUInt16LE(20, 6)
    centralEntry.writeUInt16LE(0, 8)
    centralEntry.writeUInt16LE(0, 10)
    centralEntry.writeUInt16LE(time, 12)
    centralEntry.writeUInt16LE(date, 14)
    centralEntry.writeUInt32LE(crc, 16)
    centralEntry.writeUInt32LE(data.length, 20)
    centralEntry.writeUInt32LE(data.length, 24)
    centralEntry.writeUInt16LE(nameBytes.length, 28)
    centralEntry.writeUInt16LE(0, 30)
    centralEntry.writeUInt16LE(0, 32)
    centralEntry.writeUInt16LE(0, 34)
    centralEntry.writeUInt16LE(0, 36)
    centralEntry.writeUInt32LE(0, 38)
    centralEntry.writeUInt32LE(offset, 42)
    nameBytes.copy(centralEntry, 46)

    centralDirectory.push(centralEntry)
    offset += localHeader.length + data.length
  }

  const centralDirData = Buffer.concat(centralDirectory)

  // End of central directory
  const endRecord = Buffer.alloc(22)
  endRecord.writeUInt32LE(0x06054b50, 0)
  endRecord.writeUInt16LE(0, 4)
  endRecord.writeUInt16LE(0, 6)
  endRecord.writeUInt16LE(files.length, 8)
  endRecord.writeUInt16LE(files.length, 10)
  endRecord.writeUInt32LE(centralDirData.length, 12)
  endRecord.writeUInt32LE(offset, 16)
  endRecord.writeUInt16LE(0, 20)

  return Buffer.concat([...parts, centralDirData, endRecord])
}

function getCRC32(buf: Buffer): number {
  let crc = 0xffffffff

  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i]
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}
