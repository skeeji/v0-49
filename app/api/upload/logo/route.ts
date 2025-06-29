import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("logo") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Type de fichier image non supporté" }, { status: 400 })
    }

    // Simulation de sauvegarde du fichier
    const filename = `logo-${Date.now()}-${file.name}`
    const filePath = `/uploads/logos/${filename}`

    console.log("🏷️ Logo sauvegardé:", filename)

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      filename: filename,
      path: filePath,
    })
  } catch (error) {
    console.error("Erreur lors de l'upload du logo:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
