import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { uploadFile } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API upload/logo: Début upload logo")

    const formData = await request.formData()
    const file = formData.get("logo") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier logo fourni" })
    }

    console.log(`📁 Fichier logo reçu: ${file.name}, taille: ${file.size} bytes, type: ${file.type}`)

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Le fichier doit être une image" })
    }

    const db = await getDatabase()

    // Supprimer l'ancien logo s'il y en a un
    const oldLogo = await db.collection("logos").findOne({})
    if (oldLogo) {
      console.log("🗑️ Suppression de l'ancien logo")
      await db.collection("logos").deleteOne({ _id: oldLogo._id })
      // TODO: Supprimer aussi le fichier GridFS
    }

    // Convertir le fichier en buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Uploader vers GridFS
    console.log("📤 Upload vers GridFS...")
    const fileId = await uploadFile(file.name, buffer, file.type)
    console.log("✅ Fichier uploadé vers GridFS, ID:", fileId)

    // Sauvegarder les métadonnées en base
    const logoDoc = {
      filename: file.name,
      fileId: fileId,
      contentType: file.type,
      size: file.size,
      uploadDate: new Date(),
    }

    const result = await db.collection("logos").insertOne(logoDoc)
    console.log("✅ Métadonnées logo sauvegardées, ID:", result.insertedId)

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      logoId: result.insertedId,
    })
  } catch (error) {
    console.error("❌ Erreur upload logo:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
