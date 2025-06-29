import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { uploadFileToGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🏷️ API /api/upload/logo - Début de l'upload logo")

    const formData = await request.formData()
    const file = (formData.get("logo") as File) || (formData.get("file") as File)

    if (!file) {
      console.log("❌ Aucun fichier logo fourni")
      return NextResponse.json({ error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier logo reçu: ${file.name} (${file.size} bytes, ${file.type})`)

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 })
    }

    // Convertir en buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log(`📊 Buffer créé: ${buffer.length} bytes`)

    // Upload vers GridFS
    const client = await clientPromise
    const result = await uploadFileToGridFS(client, DBNAME, buffer, file.name, file.type, {
      type: "logo",
      originalName: file.name,
      uploadDate: new Date(),
    })

    console.log(`✅ Logo uploadé avec succès: ${result.filename}`)

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      filename: result.filename,
      fileId: result.fileId.toString(),
      size: result.size,
      contentType: file.type,
    })
  } catch (error: any) {
    console.error("❌ Erreur lors de l'upload logo:", error)
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
