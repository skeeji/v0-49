import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API /api/upload/period-images - Début de l'upload")

    const formData = await request.formData()
    const periodName = formData.get("periodName") as string
    const file = formData.get("image") as File

    if (!periodName || !file) {
      return NextResponse.json({ error: "Nom de période et fichier requis" }, { status: 400 })
    }

    console.log(`📁 Upload image pour la période: ${periodName}`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Nom de fichier unique pour la période
    const filename = `period-${periodName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}`

    // Vérifier si une image existe déjà pour cette période
    const existingFiles = await bucket.find({ "metadata.periodName": periodName }).toArray()

    // Supprimer l'ancienne image si elle existe
    for (const existingFile of existingFiles) {
      await bucket.delete(existingFile._id)
      console.log(`🗑️ Ancienne image supprimée pour ${periodName}`)
    }

    // Upload du nouveau fichier
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        type: "period-image",
        periodName: periodName,
        originalName: file.name,
        uploadDate: new Date(),
      },
    })

    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    await new Promise<void>((resolve, reject) => {
      uploadStream.end(uint8Array, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })

    console.log(`✅ Image uploadée pour ${periodName}: ${filename}`)

    return NextResponse.json({
      success: true,
      message: `Image uploadée pour la période ${periodName}`,
      filename: filename,
      periodName: periodName,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload image période:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
