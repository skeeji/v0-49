import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🏷️ API /api/upload/logo - Upload logo")

    const formData = await request.formData()
    const file = formData.get("logo") as File

    if (!file) {
      console.log("❌ Aucun fichier logo fourni")
      return NextResponse.json({ error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier logo reçu: ${file.name} (${file.size} bytes)`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Supprimer l'ancien logo s'il y en a un
    try {
      const existingFiles = await bucket.find({ "metadata.type": "logo" }).toArray()
      for (const existingFile of existingFiles) {
        await bucket.delete(existingFile._id)
        console.log(`🗑️ Ancien logo supprimé: ${existingFile.filename}`)
      }
    } catch (error) {
      console.log("⚠️ Aucun ancien logo à supprimer")
    }

    // Upload du nouveau logo
    const buffer = Buffer.from(await file.arrayBuffer())

    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.type,
      metadata: {
        type: "logo",
        originalName: file.name,
        uploadDate: new Date(),
      },
    })

    await new Promise((resolve, reject) => {
      uploadStream.on("error", reject)
      uploadStream.on("finish", resolve)
      uploadStream.end(buffer)
    })

    const fileId = uploadStream.id.toString()
    console.log(`✅ Logo uploadé avec l'ID: ${fileId}`)

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      filename: file.name,
      fileId: fileId,
      size: file.size,
      url: `/api/logo`,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload logo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'upload du logo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
