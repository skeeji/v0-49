import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"
import { Readable } from "stream"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

function fileToStream(file: File): Readable {
  const reader = file.stream().getReader()
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read()
        this.push(done ? null : Buffer.from(value))
      } catch (error) {
        this.destroy(error as Error)
      }
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
      return NextResponse.json({ success: false, error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    console.log(`🏷️ Logo reçu: ${file.name}, ${file.size} bytes`)

    // Supprimer l'ancien logo s'il existe
    const client = await clientPromise
    const db = client.db(DBNAME)

    const existingLogo = await db.collection("settings").findOne({ type: "logo" })
    if (existingLogo && existingLogo.fileId) {
      try {
        await bucket.delete(existingLogo.fileId)
        console.log("🗑️ Ancien logo supprimé")
      } catch (error) {
        console.warn("⚠️ Impossible de supprimer l'ancien logo:", error)
      }
    }

    // Upload du nouveau logo
    const stream = fileToStream(file)
    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.type,
      metadata: {
        type: "logo",
        originalName: file.name,
        size: file.size,
        uploadDate: new Date(),
      },
    })

    await new Promise<void>((resolve, reject) => {
      stream.pipe(uploadStream).on("error", reject).on("finish", resolve)
    })

    const fileId = uploadStream.id.toString()

    // Sauvegarder les métadonnées du logo
    await db.collection("settings").replaceOne(
      { type: "logo" },
      {
        type: "logo",
        filename: file.name,
        fileId: fileId,
        path: `/api/images/${fileId}`,
        contentType: file.type,
        size: file.size,
        uploadDate: new Date(),
      },
      { upsert: true },
    )

    console.log(`✅ Logo sauvegardé avec l'ID: ${fileId}`)

    return NextResponse.json({
      success: true,
      message: "Logo uploadé avec succès",
      filename: file.name,
      fileId: fileId,
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
