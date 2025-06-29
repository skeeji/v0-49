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

    const formData = await request.formData()
    const file = formData.get("logo") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier logo reçu: ${file.name} (${file.size} bytes)`)

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 })
    }

    try {
      const bucket = await getBucket()

      // Supprimer l'ancien logo s'il y en a un
      const existingFiles = await bucket.find({ filename: "site-logo" }).toArray()
      for (const existingFile of existingFiles) {
        await bucket.delete(existingFile._id)
        console.log("🗑️ Ancien logo supprimé")
      }

      // Upload du nouveau logo
      console.log("📤 Upload du logo vers GridFS...")

      const stream = fileToStream(file)
      const uploadStream = bucket.openUploadStream("site-logo", {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadDate: new Date(),
          type: "site-logo",
        },
      })

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout upload logo (30s)"))
        }, 30000) // 30 secondes pour les logos

        stream
          .pipe(uploadStream)
          .on("error", (err) => {
            clearTimeout(timeout)
            console.error("❌ Erreur upload logo:", err)
            reject(err)
          })
          .on("finish", () => {
            clearTimeout(timeout)
            console.log("✅ Logo uploadé avec succès")
            resolve()
          })
      })

      const fileId = uploadStream.id.toString()

      console.log(`✅ Logo uploadé avec l'ID: ${fileId}`)

      return NextResponse.json({
        success: true,
        message: "Logo uploadé avec succès",
        fileId,
        filename: "site-logo",
        originalName: file.name,
        size: file.size,
        url: `/api/logo`,
      })
    } catch (uploadError: any) {
      console.error("❌ Erreur lors de l'upload logo:", uploadError)
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de l'upload du logo",
          details: uploadError.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ Erreur critique upload logo:", error)
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
