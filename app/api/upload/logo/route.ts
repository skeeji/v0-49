import { type NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    console.log("🏷️ API POST /api/upload/logo appelée")

    const formData = await request.formData()
    const logo = formData.get("logo") as Blob | null

    if (!logo) {
      console.log("❌ Aucun logo trouvé dans la requête")
      return NextResponse.json({ success: false, error: "Aucun logo trouvé" }, { status: 400 })
    }

    const buffer = Buffer.from(await logo.arrayBuffer())
    const filename = `logo.${logo.type.split("/")[1]}` // logo.name;
    const uploadDir = path.join(process.cwd(), "public")
    const filePath = path.join(uploadDir, filename)

    console.log(`📁 Fichier reçu: ${logo.name}, Taille: ${logo.size} bytes, Type: ${logo.type}`)
    console.log(`💾 Sauvegarde du logo: ${filePath}`)

    await writeFile(filePath, buffer)

    console.log(`✅ Logo sauvegardé: ${filename}`)

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      filename: filename,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/upload/logo:", error)
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
