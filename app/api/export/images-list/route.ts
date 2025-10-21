import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("📋 Récupération de la liste des images...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer les luminaires pour identifier les images designers
    const luminairesCollection = db.collection("luminaires")
    const allLuminaires = await luminairesCollection.find({}).toArray()

    const designerImageNames = new Set<string>()
    allLuminaires.forEach((lum) => {
      const fields = [
        "designerImageFilename",
        "Image designer (imagedesigner)",
        "imagedesigner",
        "Image designer",
        "designer_image",
        "designerImage",
      ]

      for (const field of fields) {
        const value = lum[field]
        if (value && typeof value === "string" && value.trim()) {
          designerImageNames.add(value.trim())
        }
      }
    })

    // Récupérer la liste des fichiers
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const files = await bucket.find({}).toArray()

    console.log(`📁 ${files.length} fichiers trouvés`)

    const imagesList = files.map((file) => {
      const isDesigner = designerImageNames.has(file.filename)
      return {
        id: file._id.toString(),
        filename: file.filename,
        folder: isDesigner ? "designers" : "luminaires",
        size: file.length,
      }
    })

    return NextResponse.json({
      success: true,
      images: imagesList,
      total: imagesList.length,
      designers: imagesList.filter((img) => img.folder === "designers").length,
      luminaires: imagesList.filter((img) => img.folder === "luminaires").length,
    })
  } catch (error: any) {
    console.error("❌ Erreur:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
