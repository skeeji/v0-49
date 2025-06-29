import { type NextRequest, NextResponse } from "next/server"
import { getBucket } from "@/lib/gridfs"
import { Readable } from "stream"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

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
    console.log("🏷️ API POST /api/upload/logo appelée")

    const formData = await request.formData()
    const file = formData.get("logo") as File

    if (!file) {
      console.log("❌ Aucun fichier logo trouvé dans la requête")
      return NextResponse.json({ success: false, error: "Aucun fichier logo trouvé" }, { status: 400 })
    }

    console.log(`📁 Logo reçu: ${file.name} (${file.size} bytes)`)

    const bucket = await getBucket()

    // Upload vers GridFS
    const stream = fileToStream(file)
    const uploadStream = bucket.openUploadStream(`logo_${Date.now()}_${file.name}`, {
      contentType: file.type,
    })

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", () => resolve())
    })

    const fileId = uploadStream.id.toString()
    console.log(`✅ Logo uploadé avec l'ID: ${fileId}`)

    // Sauvegarder les métadonnées en base
    const client = await clientPromise
    const db = client.db(DBNAME)

    const logoData = {
      filename: file.name,
      fileId: fileId,
      path: `/api/images/${fileId}`,
      size: file.size,
      contentType: file.type,
      uploadedAt: new Date(),
    }

    await db.collection("logos").insertOne(logoData)

    console.log(`✅ Métadonnées logo sauvegardées`)

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
