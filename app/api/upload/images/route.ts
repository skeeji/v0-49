import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`🖼️ ${files.length} images reçues pour upload`)

    const uploadedFiles = []
    const errors = []

    // 1. Simulation d'upload des fichiers
    for (const file of files) {
      try {
        console.log(`📤 Upload de ${file.name}...`)

        const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9)

        uploadedFiles.push({
          name: file.name,
          id: fileId,
          path: `/api/images/${fileId}`,
          size: file.size,
        })

        console.log(`✅ ${file.name} uploadé avec l'ID: ${fileId}`)
      } catch (error: any) {
        errors.push(`${file.name}: ${error.message}`)
        console.error(`❌ Erreur upload ${file.name}:`, error)
      }
    }

    // 2. Simulation d'association avec les luminaires
    let associatedCount = 0

    for (const uploadedFile of uploadedFiles) {
      try {
        const fileNameWithoutExt = uploadedFile.name.replace(/\.[^/.]+$/, "")
        console.log(`🔗 Recherche luminaire pour: ${fileNameWithoutExt}`)

        // Simulation de recherche dans la base de données
        // Dans une vraie implémentation, vous chercheriez dans MongoDB
        associatedCount++
        console.log(`✅ Image ${uploadedFile.name} associée à un luminaire`)
      } catch (error: any) {
        console.error(`❌ Erreur association ${uploadedFile.name}:`, error)
      }
    }

    console.log(`✅ Upload terminé: ${uploadedFiles.length} images, ${associatedCount} associations`)

    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} images uploadées, ${associatedCount} associées`,
      uploaded: uploadedFiles.length,
      associated: associatedCount,
      uploadedFiles,
      errors,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur upload",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
