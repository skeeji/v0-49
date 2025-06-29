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
    console.log("🎥 API /api/upload/video - Début du traitement")

    const bucket = await getBucket()
    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const description = formData.get("description") as string

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Vidéo reçue: ${file.name}, taille: ${file.size} bytes`)

    // Upload vers GridFS
    const stream = fileToStream(file)
    const uploadStream = bucket.openUploadStream(`video-${Date.now()}-${file.name}`, {
      contentType: file.type,
      metadata: {
        type: "video",
        title: title || "Vidéo d'accueil",
        description: description || "Vidéo de bienvenue",
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

    console.log(`✅ Vidéo uploadée avec l'ID: ${fileId}`)

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      fileId: fileId,
      filename: uploadStream.filename,
      path: `/api/images/${fileId}`,
      title: title,
      description: description,
    })
  } catch (error: any) {
    console.error("❌ Erreur upload vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'upload de la vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
