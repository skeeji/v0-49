import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const periodName = formData.get("periodName") as string

    if (!file || !periodName) {
      return NextResponse.json({ success: false, message: "Fichier et nom de période requis" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "period-images" })

    // Supprimer l'ancienne image si elle existe
    try {
      const existingFiles = await bucket.find({ "metadata.periodName": periodName }).toArray()
      for (const existingFile of existingFiles) {
        await bucket.delete(existingFile._id)
      }
    } catch (error) {
      console.log("Aucune image existante à supprimer")
    }

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Créer un nom de fichier unique
    const filename = `${periodName}-${Date.now()}-${file.name}`

    // Upload vers GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        periodName: periodName,
        originalName: file.name,
        contentType: file.type,
        uploadDate: new Date(),
      },
    })

    return new Promise((resolve) => {
      uploadStream.end(buffer, (error) => {
        if (error) {
          console.error("Erreur upload GridFS:", error)
          resolve(NextResponse.json({ success: false, message: "Erreur lors de l'upload" }, { status: 500 }))
        } else {
          console.log(`✅ Image période uploadée: ${filename} pour ${periodName}`)
          resolve(
            NextResponse.json({
              success: true,
              message: `Image pour ${periodName} uploadée avec succès`,
              filename: filename,
            }),
          )
        }
      })
    })
  } catch (error: any) {
    console.error("Erreur upload image période:", error)
    return NextResponse.json({ success: false, message: "Erreur serveur", error: error.message }, { status: 500 })
  }
}
