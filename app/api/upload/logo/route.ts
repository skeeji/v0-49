import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🏷️ API POST /api/upload/logo appelée")

    const formData = await request.formData()
    const logoFile = formData.get("logo") as File

    if (!logoFile) {
      return NextResponse.json({ success: false, error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    console.log(`📁 Logo reçu: ${logoFile.name}, taille: ${logoFile.size} bytes`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    // Supprimer l'ancien logo s'il existe
    try {
      const existingLogos = await bucket.find({ "metadata.type": "logo" }).toArray()
      for (const logo of existingLogos) {
        await bucket.delete(logo._id)
        console.log(`🗑️ Ancien logo supprimé: ${logo.filename}`)
      }
    } catch (error) {
      console.log("ℹ️ Aucun ancien logo à supprimer")
    }

    // Uploader le nouveau logo
    const buffer = Buffer.from(await logoFile.arrayBuffer())
    const uploadStream = bucket.openUploadStream(logoFile.name, {
      contentType: logoFile.type,
      metadata: {
        type: "logo",
        uploadedAt: new Date(),
      },
    })

    return new Promise((resolve) => {
      uploadStream.end(buffer, (error) => {
        if (error) {
          console.error("❌ Erreur upload logo:", error)
          resolve(NextResponse.json({ success: false, error: "Erreur lors de l'upload du logo" }, { status: 500 }))
        } else {
          console.log(`✅ Logo uploadé avec succès: ${logoFile.name}`)

          // Sauvegarder les informations du logo dans une collection séparée
          db.collection("settings")
            .updateOne(
              { key: "logo" },
              {
                $set: {
                  key: "logo",
                  filename: logoFile.name,
                  fileId: uploadStream.id,
                  updatedAt: new Date(),
                },
              },
              { upsert: true },
            )
            .then(() => {
              resolve(
                NextResponse.json({
                  success: true,
                  message: "Logo uploadé avec succès",
                  filename: logoFile.name,
                  fileId: uploadStream.id.toString(),
                }),
              )
            })
            .catch((dbError) => {
              console.error("❌ Erreur sauvegarde settings:", dbError)
              resolve(
                NextResponse.json(
                  { success: false, error: "Erreur lors de la sauvegarde des paramètres" },
                  { status: 500 },
                ),
              )
            })
        }
      })
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/upload/logo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload du logo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
