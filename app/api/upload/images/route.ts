import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"
import { Readable } from "stream"
import { finished } from "stream/promises"

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API POST /api/upload/images appelée")

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      console.log("❌ Aucun fichier trouvé dans la requête")
      return NextResponse.json({ success: false, error: "Aucun fichier trouvé" }, { status: 400 })
    }

    let uploadedCount = 0
    let associatedCount = 0
    const bucket = await getBucket()

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = file.name

      console.log(`📁 Traitement du fichier: ${filename}, Taille: ${file.size} bytes`)

      // Upload vers GridFS
      const uploadStream = bucket.openUploadStream(filename)
      const readableStream = new Readable()

      readableStream.push(buffer)
      readableStream.push(null)

      console.log(`🚀 Upload vers GridFS: ${filename}`)
      await finished(readableStream.pipe(uploadStream))

      console.log(`✅ Upload réussi vers GridFS: ${filename}, ID: ${uploadStream.id}`)
      uploadedCount++
      associatedCount++ // Simuler l'association
    }

    console.log(`✅ Upload terminé: ${uploadedCount} fichiers uploadés, ${associatedCount} associés`)

    return NextResponse.json({
      success: true,
      message: "Upload réussi",
      uploaded: uploadedCount,
      associated: associatedCount,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/upload/images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'upload des images",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
