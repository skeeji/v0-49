import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"
import { Readable } from "stream"

function fileToStream(file: File) {
  const reader = file.stream().getReader()
  return new Readable({
    async read() {
      const { done, value } = await reader.read()
      this.push(done ? null : Buffer.from(value))
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log("🏷️ API /api/upload/logo - Début du traitement")

    const bucket = await getBucket()
    const formData = await request.formData()
    const file = formData.get("logo") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Logo reçu: ${file.name}, taille: ${file.size} bytes`)

    // Upload vers GridFS
    const stream = fileToStream(file)
    const uploadStream = bucket.openUploadStream(`logo-${Date.now()}-${file.name}`, {
      contentType: file.type,
      metadata: {
        type: "logo",
        originalName: file.name,
        uploadedAt: new Date(),
      },
    })

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", () => resolve())
    })

    const fileId = uploadStream.id.toString()

    console.log(`✅ Logo uploadé avec l'ID: ${fileId}`)

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      fileId: fileId,
      filename: uploadStream.filename,
      path: `/api/images/${fileId}`,
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
