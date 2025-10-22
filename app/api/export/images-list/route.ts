import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("🚀 Récupération de la liste des images pour export...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Récupérer tous les luminaires pour identifier les images designers
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
          designerImageNames.add(value.trim().toLowerCase())
        }
      }
    })

    console.log(`👤 ${designerImageNames.size} images designers identifiées`)

    // Récupérer la liste de tous les fichiers
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const files = await bucket.find({}).toArray()

    console.log(`📁 ${files.length} fichiers trouvés dans GridFS`)

    if (files.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Aucune image trouvée",
        total: 0,
        luminaires: 0,
        designers: 0,
        autres: 0,
        images: [],
      })
    }

    // Identifier les fichiers "autres" (logo, vidéo, périodes)
    const autresKeywords = [
      "logo",
      "welcome",
      "video",
      "period",
      "periode",
      "moyen-age",
      "xvie",
      "xviie",
      "xviiie",
      "xixe",
      "art-nouveau",
      "art-deco",
      "contemporain",
    ]

    const images = files.map((file) => {
      const filenameLower = file.filename.toLowerCase()

      // Vérifier si c'est un fichier "autres"
      const isAutres = autresKeywords.some((keyword) => filenameLower.includes(keyword))

      if (isAutres) {
        return {
          id: file._id.toString(),
          filename: file.filename,
          folder: "autres",
        }
      }

      // Vérifier si c'est une image designer
      const isDesigner = designerImageNames.has(filenameLower)

      // Pattern nom-prenom.jpg pour les designers
      const designerPattern = /^[a-z]+-[a-z]+\.(jpg|jpeg|png|gif|webp)$/i
      const matchesDesignerPattern = designerPattern.test(filenameLower)

      if (isDesigner || matchesDesignerPattern) {
        return {
          id: file._id.toString(),
          filename: file.filename,
          folder: "designers",
        }
      }

      // Sinon, c'est une image de luminaire
      return {
        id: file._id.toString(),
        filename: file.filename,
        folder: "luminaires",
      }
    })

    const designersCount = images.filter((img) => img.folder === "designers").length
    const luminairesCount = images.filter((img) => img.folder === "luminaires").length
    const autresCount = images.filter((img) => img.folder === "autres").length

    console.log(`📊 Répartition: ${luminairesCount} luminaires, ${designersCount} designers, ${autresCount} autres`)

    return NextResponse.json({
      success: true,
      total: images.length,
      luminaires: luminairesCount,
      designers: designersCount,
      autres: autresCount,
      images,
    })
  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération de la liste des images:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        total: 0,
        luminaires: 0,
        designers: 0,
        autres: 0,
        images: [],
      },
      { status: 500 },
    )
  }
}
