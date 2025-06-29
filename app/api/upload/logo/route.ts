import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    console.log("🏷️ === DÉBUT UPLOAD LOGO ===")

    const { db } = await connectToDatabase()
    const bucket = new GridFSBucket(db, { bucketName: "logos" })

    const formData = await request.formData()
    const logoFile = formData.get("logo") as File

    if (!logoFile) {
      return NextResponse.json({ success: false, error: "Aucun fichier logo fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier logo reçu: ${logoFile.name}, taille: ${logoFile.size} bytes`)

    // Supprimer l'ancien logo s'il y en a un
    try {
      const existingLogos = await db.collection("logos.files").find({ "metadata.type": "main" }).toArray()
      for (const logo of existingLogos) {
        await bucket.delete(logo._id)
        console.log(`🗑️ Ancien logo supprimé: ${logo.filename}`)
      }
    } catch (error) {
      console.log("ℹ️ Aucun ancien logo à supprimer")
    }

    // Convertir le fichier en buffer
    const arrayBuffer = await logoFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload vers GridFS
    const uploadStream = bucket.openUploadStream(logoFile.name, {
      metadata: {
        type: "main",
        originalName: logoFile.name,
        uploadDate: new Date(),
        contentType: logoFile.type,
      },
    })

    return new Promise((resolve) => {
      uploadStream.on("finish", () => {
        console.log(`✅ Logo uploadé avec succès: ${logoFile.name}, ID: ${uploadStream.id}`)
        resolve(
          NextResponse.json({
            success: true,
            message: `Logo uploadé avec succès: ${logoFile.name}`,
            fileId: uploadStream.id.toString(),
            filename: logoFile.name,
          }),
        )
      })

      uploadStream.on("error", (error) => {
        console.error("❌ Erreur upload logo:", error)
        resolve(NextResponse.json({ success: false, error: "Erreur lors de l'upload du logo" }, { status: 500 }))
      })

      uploadStream.end(buffer)
    })
  } catch (error) {
    console.error("❌ Erreur générale upload logo:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur lors de l'upload logo" }, { status: 500 })
  }
}
