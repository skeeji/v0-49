import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"
import fs from "fs"
import path from "path"
import os from "os"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const chunk      = formData.get("chunk")      as File
    const chunkIndex = parseInt(formData.get("chunkIndex") as string)
    const totalChunks = parseInt(formData.get("totalChunks") as string)
    const fileName   = formData.get("fileName")   as string
    const section    = formData.get("section")    as string   // "painting"
    const index      = formData.get("index")      as string   // "0"

    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName) {
      return NextResponse.json({ success: false, error: "Paramètres manquants" }, { status: 400 })
    }

    // Dossier temporaire pour les chunks
    const tempDir = path.join(os.tmpdir(), "painting-chunks")
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    // Sauvegarder ce chunk
    const safeFile = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const chunkPath = path.join(tempDir, `${safeFile}.chunk.${chunkIndex}`)
    fs.writeFileSync(chunkPath, Buffer.from(await chunk.arrayBuffer()))

    // Si c'est le dernier chunk → assembler et uploader dans GridFS
    if (chunkIndex === totalChunks - 1) {
      try {
        const parts: Buffer[] = []
        for (let i = 0; i < totalChunks; i++) {
          const p = path.join(tempDir, `${safeFile}.chunk.${i}`)
          if (!fs.existsSync(p)) throw new Error(`Chunk ${i} manquant`)
          parts.push(fs.readFileSync(p))
        }
        const completeBuffer = Buffer.concat(parts)

        const client = await clientPromise
        const db = client.db(DBNAME)
        const bucket = new GridFSBucket(db, { bucketName: "uploads" })

        const metadataKey = `homepage_${section}_${index || "0"}`

        // Supprimer l'ancienne version
        const existing = await db.collection("uploads.files")
          .find({ "metadata.homepageKey": metadataKey })
          .toArray()
        for (const f of existing) await bucket.delete(f._id)

        // Uploader dans GridFS
        const uploadStream = bucket.openUploadStream(fileName, {
          metadata: {
            homepageKey: metadataKey,
            section,
            index: index || "0",
            uploadDate: new Date(),
            contentType: "image/png",
          },
        })

        await new Promise<void>((resolve, reject) => {
          uploadStream.on("error", reject)
          uploadStream.end(completeBuffer, resolve)
        })

        // Nettoyage
        for (let i = 0; i < totalChunks; i++) {
          const p = path.join(tempDir, `${safeFile}.chunk.${i}`)
          if (fs.existsSync(p)) fs.unlinkSync(p)
        }

        return NextResponse.json({
          success: true,
          message: "Tableau uploadé avec succès",
          fileId: uploadStream.id,
        })
      } catch (err: any) {
        // Nettoyage en cas d'erreur
        for (let i = 0; i < totalChunks; i++) {
          const p = path.join(tempDir, `${safeFile}.chunk.${i}`)
          if (fs.existsSync(p)) fs.unlinkSync(p)
        }
        return NextResponse.json({ success: false, error: `Erreur assemblage: ${err.message}` }, { status: 500 })
      }
    }

    // Chunk intermédiaire reçu
    return NextResponse.json({ success: true, message: `Chunk ${chunkIndex + 1}/${totalChunks} reçu` })
  } catch (err: any) {
    console.error("❌ Erreur upload chunk tableau:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
