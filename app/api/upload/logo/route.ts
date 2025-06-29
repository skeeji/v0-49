import { type NextRequest, NextResponse } from "next/server"
import { uploadToGridFS } from "@/lib/gridfs"

export async function POST(request: NextRequest) {
  try {
    console.log("🏷️ API /api/upload/logo - Début du traitement")

    const formData = await request.formData()

    // Essayer différents noms de champs
    let logoFile = formData.get("logo") as File
    if (!logoFile) {
      logoFile = formData.get("file") as File
    }
    if (!logoFile) {
      logoFile = formData.get("image") as File
    }

    console.log("📁 Fichier logo reçu:", logoFile?.name, logoFile?.size)

    if (!logoFile) {
      console.log("❌ Aucun fichier logo fourni")
      return NextResponse.json({ error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    // Vérifier le type de fichier
    if (!logoFile.type.startsWith("image/")) {
      console.log("❌ Type de fichier invalide:", logoFile.type)
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 })
    }

    console.log(`📁 Upload logo: ${logoFile.name} (${logoFile.size} bytes)`)

    // Convertir le fichier en buffer
    const buffer = Buffer.from(await logoFile.arrayBuffer())

    // Upload vers GridFS
    const fileId = await uploadToGridFS(buffer, logoFile.name, {
      contentType: logoFile.type,
      originalName: logoFile.name,
      size: logoFile.size,
      category: "logo",
    })

    console.log(`✅ Logo uploadé avec l'ID: ${fileId}`)

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      filename: logoFile.name,
      fileId: fileId.toString(),
      url: `/api/images/${fileId}`,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'upload logo:", error)
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
