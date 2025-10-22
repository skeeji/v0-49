import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("luminaires-gallery")

    // Récupérer tous les fichiers de GridFS
    const bucket = new GridFSBucket(db, { bucketName: "images" })
    const files = await bucket.find({}).toArray()

    console.log(`📋 Total fichiers trouvés: ${files.length}`)

    // Récupérer la liste de tous les designers pour identifier les images designers
    const designersCollection = db.collection("designers")
    const designers = await designersCollection.find({}).toArray()

    // Créer un Set avec tous les noms de fichiers des designers (en minuscules pour la comparaison)
    const designerImageFilenames = new Set<string>()
    designers.forEach((designer: any) => {
      if (designer.imagedesigner) {
        designerImageFilenames.add(designer.imagedesigner.toLowerCase())
      }
    })

    console.log(`👥 Images designers identifiées: ${designerImageFilenames.size}`)

    // Fichiers spéciaux à mettre dans le dossier "autres"
    const specialFiles = new Set<string>()

    // Ajouter le logo
    const logoDoc = await db.collection("settings").findOne({ key: "logo" })
    if (logoDoc?.filename) {
      specialFiles.add(logoDoc.filename.toLowerCase())
    }

    // Ajouter la vidéo de bienvenue
    const videoDoc = await db.collection("settings").findOne({ key: "welcome_video" })
    if (videoDoc?.filename) {
      specialFiles.add(videoDoc.filename.toLowerCase())
    }

    // Ajouter les images de périodes
    const periodImages = await db.collection("period_images").find({}).toArray()
    periodImages.forEach((period: any) => {
      if (period.filename) {
        specialFiles.add(period.filename.toLowerCase())
      }
    })

    console.log(`📦 Fichiers spéciaux identifiés: ${specialFiles.size}`)

    // Catégoriser les images
    const imagesList = files.map((file: any) => {
      const filename = String(file.filename || "")
      const filenameLower = filename.toLowerCase()

      let folder = "luminaires"

      // Vérifier si c'est un fichier spécial
      if (specialFiles.has(filenameLower)) {
        folder = "autres"
      }
      // Vérifier si c'est une image de designer
      else if (designerImageFilenames.has(filenameLower)) {
        folder = "designers"
      }
      // Vérifier si le nom contient des patterns de designers (nom-prenom.jpg)
      else if (filenameLower.match(/^[a-z]+[-_][a-z]+\.(jpg|jpeg|png|gif|webp)$/i)) {
        folder = "designers"
      }

      return {
        id: String(file._id),
        filename: filename,
        folder: folder,
      }
    })

    const luminairesCount = imagesList.filter((img) => img.folder === "luminaires").length
    const designersCount = imagesList.filter((img) => img.folder === "designers").length
    const autresCount = imagesList.filter((img) => img.folder === "autres").length

    console.log(`📊 Répartition:`)
    console.log(`  - Luminaires: ${luminairesCount}`)
    console.log(`  - Designers: ${designersCount}`)
    console.log(`  - Autres: ${autresCount}`)

    return NextResponse.json({
      success: true,
      total: imagesList.length,
      luminaires: luminairesCount,
      designers: designersCount,
      autres: autresCount,
      images: imagesList,
    })
  } catch (error: any) {
    console.error("❌ Erreur liste images:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
