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

    const formData = await request.formData()
    const file = formData.get("video") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier vidéo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier vidéo reçu: ${file.name} (${file.size} bytes)`)

    // Vérifier le type de fichier
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Le fichier doit être une vidéo" }, { status: 400 })
    }

    try {
      const bucket = await getBucket()

      // Supprimer l'ancienne vidéo s'il y en a une
      const existingFiles = await bucket.find({ filename: "background-video" }).toArray()
      for (const existingFile of existingFiles) {
        await bucket.delete(existingFile._id)
        console.log("🗑️ Ancienne vidéo supprimée")
      }

      // Upload de la nouvelle vidéo
      console.log("📤 Upload de la vidéo vers GridFS...")

      const stream = fileToStream(file)
      const uploadStream = bucket.openUploadStream("background-video", {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadDate: new Date(),
          type: "background-video",
        },
      })

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout upload vidéo (60s)"))
        }, 60000) // 60 secondes pour les vidéos

        stream
          .pipe(uploadStream)
          .on("error", (err) => {
            clearTimeout(timeout)
            console.error("❌ Erreur upload vidéo:", err)
            reject(err)
          })
          .on("finish", () => {
            clearTimeout(timeout)
            console.log("✅ Vidéo uploadée avec succès")
            resolve()
          })
      })

      const fileId = uploadStream.id.toString()

      console.log(`✅ Vidéo uploadée avec l'ID: ${fileId}`)

      return NextResponse.json({
        success: true,
        message: "Vidéo uploadée avec succès",
        fileId,
        filename: "background-video",
        originalName: file.name,
        size: file.size,
        url: `/api/videos/${fileId}`,
      })
    } catch (uploadError: any) {
      console.error("❌ Erreur lors de l'upload vidéo:", uploadError)
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de l'upload de la vidéo",
          details: uploadError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ Erreur critique upload vidéo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
