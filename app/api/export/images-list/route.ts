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

    // Récupérer tous les luminaires
    const luminairesCollection = db.collection("luminaires")
    const allLuminaires = await luminairesCollection.find({}).toArray()

    // Set pour les images de luminaires (Image luminaire - Nom du fichier)
    const luminaireImageNames = new Set<string>()

    // Set pour les images de designers (Image designer - imagedesigner)
    const designerImageNames = new Set<string>()

    allLuminaires.forEach((lum) => {
      // Images de luminaires - chercher dans tous les champs possibles
      const luminaireFields = [
        "Image luminaire (Nom du fichier)",
        "Image luminaire",
        "Nom du fichier",
        "filename",
        "imageFilename",
        "image_filename",
      ]

      for (const field of luminaireFields) {
        const value = lum[field]
        if (value && typeof value === "string" && value.trim()) {
          luminaireImageNames.add(value.trim().toLowerCase())
        }
      }

      // Images de designers - chercher dans tous les champs possibles
      const designerFields = [
        "Image designer (imagedesigner)",
        "imagedesigner",
        "Image designer",
        "designer_image",
        "designerImage",
        "designerImageFilename",
      ]

      for (const field of designerFields) {
        const value = lum[field]
        if (value && typeof value === "string" && value.trim()) {
          designerImageNames.add(value.trim().toLowerCase())
        }
      }
    })

    console.log(`🖼️  ${luminaireImageNames.size} images de luminaires identifiées`)
    console.log(`👤 ${designerImageNames.size} images de designers identifiées`)

    // Récupérer tous les fichiers de GridFS
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

    // Catégoriser les images
    const images = files.map((file) => {
      const filenameLower = file.filename.toLowerCase()

      // Vérifier si c'est une image de luminaire
      if (luminaireImageNames.has(filenameLower)) {
        return {
          id: file._id.toString(),
          filename: file.filename,
          folder: "luminaires",
        }
      }

      // Vérifier si c'est une image de designer
      if (designerImageNames.has(filenameLower)) {
        return {
          id: file._id.toString(),
          filename: file.filename,
          folder: "designers",
        }
      }

      // Tout le reste va dans "autres"
      return {
        id: file._id.toString(),
        filename: file.filename,
        folder: "autres",
      }
    })

    const luminairesCount = images.filter((img) => img.folder === "luminaires").length
    const designersCount = images.filter((img) => img.folder === "designers").length
    const autresCount = images.filter((img) => img.folder === "autres").length

    console.log(`📊 Répartition finale:`)
    console.log(`   - Luminaires: ${luminairesCount}`)
    console.log(`   - Designers: ${designersCount}`)
    console.log(`   - Autres: ${autresCount}`)

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
