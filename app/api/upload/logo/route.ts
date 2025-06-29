import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { uploadToGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/logo - Début du traitement")

    const formData = await request.formData()
    const file = formData.get("logo") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    console.log(`📁 Logo reçu: ${file.name}, taille: ${file.size} bytes`)

    // Convertir le fichier en buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload vers GridFS
    const fileId = await uploadToGridFS(buffer, file.name, {
      contentType: file.type,
      originalName: file.name,
      size: file.size,
      type: "logo",
    })

    // Sauvegarder les métadonnées dans settings
    const client = await clientPromise
    const db = client.db(DBNAME)

    await db.collection("settings").updateOne(
      { key: "logo" },
      {
        $set: {
          key: "logo",
          value: {
            fileId: fileId.toString(),
            filename: file.name,
            url: `/api/logo`,
            uploadDate: new Date(),
          },
        },
      },
      { upsert: true },
    )

    console.log(`✅ Logo sauvegardé: ${file.name}`)

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      filename: file.name,
      fileId: fileId.toString(),
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
