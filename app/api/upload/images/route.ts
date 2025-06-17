import { type NextRequest, NextResponse } from "next/server"
import { saveUploadedFile, isValidImageType } from "@/lib/upload"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    const uploadedFiles = []
    const errors = []

    for (const file of files) {
      try {
        if (!isValidImageType(file.name)) {
          errors.push(`${file.name}: Type de fichier non supporté`)
          continue
        }

        const filePath = await saveUploadedFile(file, "images")
        uploadedFiles.push({
          name: file.name,
          path: filePath,
          size: file.size,
        })
      } catch (error) {
        errors.push(`${file.name}: ${error}`)
      }
    }

    return NextResponse.json({
      uploadedFiles,
      errors,
      message: `${uploadedFiles.length} fichiers uploadés avec succès`,
    })
  } catch (error) {
    console.error("Erreur lors de l'upload d'images:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
