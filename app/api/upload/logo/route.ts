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
      return NextResponse.json({ error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier logo reçu: ${file.name} (${file.size} bytes)`)

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Supprimer l'ancien logo s'il y en a un
    try {
      const bucket = new GridFSBucket(db, { bucketName: "uploads" })
      const existingLogos = await bucket.find({ "metadata.type": "logo" }).toArray()

      for (const logo of existingLogos) {
        await bucket.delete(logo._id)
        console.log(`🗑️ Ancien logo supprimé: ${logo.filename}`)
      }
    } catch (error) {
      console.log("⚠️ Aucun ancien logo à supprimer")
    }

    // Upload du nouveau logo
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        type: "logo",
        originalName: file.name,
        uploadDate: new Date(),
      },
    })

    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    return new Promise((resolve) => {
      uploadStream.end(uint8Array, (error) => {
        if (error) {
          console.error("❌ Erreur upload logo:", error)
          resolve(
            NextResponse.json(
              {
                success: false,
                error: "Erreur lors de l'upload du logo",
                details: error.message,
              },
              { status: 500 },
            ),
          )
        } else {
          console.log(`✅ Logo uploadé avec succès: ${file.name}`)
          resolve(
            NextResponse.json({
              success: true,
              message: `Logo uploadé avec succès: ${file.name}`,
              fileId: uploadStream.id,
              filename: file.name,
            }),
          )
        }
      })
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload logo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload logo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
