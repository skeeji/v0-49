import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API Upload Period Images - Début")

    const formData = await request.formData()
    const file = formData.get("image") as File
    const periodName = formData.get("periodName") as string

    console.log("📝 Données reçues:", {
      fileName: file?.name,
      fileSize: file?.size,
      periodName,
    })

    if (!file || !periodName) {
      console.log("❌ Fichier ou nom de période manquant")
      return NextResponse.json({ success: false, message: "Fichier et nom de période requis" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Supprimer l'ancienne image de cette période si elle existe
    const existingFiles = await db.collection("uploads.files").find({ "metadata.periodName": periodName }).toArray()

    for (const existingFile of existingFiles) {
      console.log(`🗑️ Suppression ancienne image: ${existingFile.filename}`)
      await bucket.delete(existingFile._id)
    }

    // Upload de la nouvelle image
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        periodName,
        uploadDate: new Date(),
        contentType: file.type,
      },
    })

    return new Promise((resolve) => {
      uploadStream.end(buffer, () => {
        console.log(`✅ Image uploadée pour période: ${periodName}`)
        resolve(
          NextResponse.json({
            success: true,
            message: `Image uploadée pour la période ${periodName}`,
            fileId: uploadStream.id,
          }),
        )
      })

      uploadStream.on("error", (error) => {
        console.error("❌ Erreur upload:", error)
        resolve(NextResponse.json({ success: false, message: "Erreur lors de l'upload" }, { status: 500 }))
      })
    })
  } catch (error) {
    console.error("❌ Erreur API upload period images:", error)
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 })
  }
}
