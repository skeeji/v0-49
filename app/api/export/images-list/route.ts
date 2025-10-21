import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("📋 Récupération de la liste des images...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer tous les designers
    const designersCollection = db.collection("designers")
    const allDesigners = await designersCollection.find({}).toArray()

    // Créer un Set avec tous les noms de fichiers des designers
    const designerImageNames = new Set<string>()

    // Ajouter les images depuis la collection designers
    allDesigners.forEach((designer) => {
      const fields = [
        "imagedesigner",
        "Image designer (imagedesigner)",
        "Image designer",
        "designer_image",
        "designerImage",
        "image",
      ]

      for (const field of fields) {
        const value = designer[field]
        if (value && typeof value === "string" && value.trim()) {
          designerImageNames.add(value.trim())
          console.log(`👤 Designer trouvé: ${designer.Nom || designer.nom} -> ${value.trim()}`)
        }
      }
    })

    // Récupérer les luminaires pour identifier les images designers référencées
    const luminairesCollection = db.collection("luminaires")
    const allLuminaires = await luminairesCollection.find({}).toArray()

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

    console.log(`👥 Total images designers identifiées: ${designerImageNames.size}`)

    // Récupérer la liste des fichiers depuis GridFS
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const files = await bucket.find({}).toArray()

    console.log(`📁 ${files.length} fichiers trouvés dans GridFS`)

    const imagesList = files.map((file) => {
      const isDesigner = designerImageNames.has(file.filename)
      return {
        id: file._id.toString(),
        filename: file.filename,
        folder: isDesigner ? "designers" : "luminaires",
        size: file.length,
      }
    })

    const designersCount = imagesList.filter((img) => img.folder === "designers").length
    const luminairesCount = imagesList.filter((img) => img.folder === "luminaires").length

    console.log(`📊 Répartition: ${designersCount} designers, ${luminairesCount} luminaires`)

    return NextResponse.json({
      success: true,
      images: imagesList,
      total: imagesList.length,
      designers: designersCount,
      luminaires: luminairesCount,
    })
  } catch (error: any) {
    console.error("❌ Erreur:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
