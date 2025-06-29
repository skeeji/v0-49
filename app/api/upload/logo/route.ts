import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🏷️ API /api/upload/logo - Début de l'upload logo")

    const formData = await request.formData()
    const file = formData.get("logo") as File

    if (!file) {
      console.log("❌ Aucun fichier logo fourni")
      return NextResponse.json({ error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier logo reçu: ${file.name} (${file.size} bytes)`)

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Supprimer l'ancien logo s'il existe
    const existingLogo = await db.collection("uploads.files").findOne({
      "metadata.type": "logo",
    })

    if (existingLogo) {
      await bucket.delete(existingLogo._id)
      console.log("🗑️ Ancien logo supprimé")
    }

    // Convertir le fichier en buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`📤 Upload vers GridFS: ${file.name}`)

    // Upload vers GridFS
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        contentType: file.type,
        uploadDate: new Date(),
        type: "logo",
        originalName: file.name,
      },
    })

    const fileId = await new Promise((resolve, reject) => {
      uploadStream.on("error", (error) => {
        console.error("❌ Erreur upload logo:", error)
        reject(error)
      })

      uploadStream.on("finish", () => {
        console.log(`✅ Logo uploadé: ${file.name} - ID: ${uploadStream.id}`)
        resolve(uploadStream.id)
      })

      uploadStream.end(buffer)
    })

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      filename: file.name,
      fileId: fileId.toString(),
      size: file.size,
      type: file.type,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload logo:", error)
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
