import { type NextRequest, NextResponse } from "next/server"
import { uploadToGridFS } from "@/lib/gridfs"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🎨 API /api/upload/logo - Début du traitement")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`🎨 Logo à uploader: ${file.name} ${file.size} bytes`)

    // Convertir le fichier en buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload vers GridFS
    const fileId = await uploadToGridFS(buffer, file.name, file.type)

    // Sauvegarder les métadonnées du logo
    const client = await clientPromise
    const db = client.db(DBNAME)

    await db.collection("settings").updateOne(
      { type: "logo" },
      {
        $set: {
          type: "logo",
          filename: file.name,
          fileId: fileId,
          contentType: file.type,
          size: file.size,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    console.log(`🎨 Logo sauvegardé: ${file.name}`)

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      filename: file.name,
      fileId: fileId,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload logo:", error)
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
