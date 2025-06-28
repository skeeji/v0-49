import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getBucket } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🏷️ Début de l'upload du logo...")

    const formData = await request.formData()
    const logoFile = formData.get("logo") as File

    if (!logoFile) {
      return NextResponse.json({ success: false, error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier logo reçu: ${logoFile.name}, taille: ${logoFile.size} bytes`)

    // Vérifier que c'est une image
    if (!logoFile.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Le fichier doit être une image" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = await getBucket()

    // Supprimer l'ancien logo s'il existe
    try {
      const existingLogo = await db.collection("settings").findOne({ type: "logo" })
      if (existingLogo && existingLogo.fileId) {
        await bucket.delete(existingLogo.fileId)
        console.log("🗑️ Ancien logo supprimé")
      }
    } catch (error) {
      console.warn("⚠️ Aucun ancien logo à supprimer")
    }

    // Uploader le nouveau logo dans GridFS
    const logoBuffer = Buffer.from(await logoFile.arrayBuffer())
    const uploadStream = bucket.openUploadStream(logoFile.name, {
      metadata: {
        type: "logo",
        originalName: logoFile.name,
        contentType: logoFile.type,
        uploadedAt: new Date(),
      },
    })

    await new Promise((resolve, reject) => {
      uploadStream.end(logoBuffer, (error) => {
        if (error) reject(error)
        else resolve(uploadStream.id)
      })
    })

    console.log(`✅ Logo uploadé avec l'ID: ${uploadStream.id}`)

    // Sauvegarder les métadonnées du logo
    await db.collection("settings").replaceOne(
      { type: "logo" },
      {
        type: "logo",
        fileId: uploadStream.id,
        filename: logoFile.name,
        contentType: logoFile.type,
        size: logoFile.size,
        uploadedAt: new Date(),
      },
      { upsert: true },
    )

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      filename: logoFile.name,
      fileId: uploadStream.id,
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
