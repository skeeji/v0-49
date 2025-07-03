import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId, GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/luminaires/associate-designer-image - Association image designer")

    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const luminaireId = formData.get("luminaireId") as string

    if (!imageFile) {
      return NextResponse.json({ success: false, error: "Aucun fichier image fourni" }, { status: 400 })
    }

    if (!luminaireId) {
      return NextResponse.json({ success: false, error: "ID du luminaire manquant" }, { status: 400 })
    }

    if (!ObjectId.isValid(luminaireId)) {
      return NextResponse.json({ success: false, error: "ID du luminaire invalide" }, { status: 400 })
    }

    console.log(
      `📊 Traitement de l'image designer: ${imageFile.name} (${imageFile.size} bytes) pour le luminaire ${luminaireId}`,
    )

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const collection = db.collection("luminaires")

    // Vérifier que le luminaire existe
    const luminaire = await collection.findOne({ _id: new ObjectId(luminaireId) })
    if (!luminaire) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 })
    }

    // Préparer le nom de fichier avec un préfixe pour identifier les images de designer
    const filename = `designer_${Date.now()}_${imageFile.name}`

    // Uploader l'image dans GridFS avec des métadonnées
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        type: "designer-image",
        luminaireId: luminaireId,
        originalName: imageFile.name,
        uploadedAt: new Date(),
      },
    })

    // Convertir le fichier en buffer et l'uploader
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    uploadStream.end(buffer)

    // Attendre la fin de l'upload
    await new Promise((resolve, reject) => {
      uploadStream.on("finish", resolve)
      uploadStream.on("error", reject)
    })

    console.log(`✅ Image designer uploadée avec le nom: ${filename}`)

    // Mettre à jour le document luminaire avec le nom de fichier de l'image designer
    const updateResult = await collection.updateOne(
      { _id: new ObjectId(luminaireId) },
      {
        $set: {
          designerImageFilename: filename,
          updatedAt: new Date(),
        },
      },
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Échec de la mise à jour du luminaire" }, { status: 500 })
    }

    console.log(`✅ Luminaire ${luminaireId} mis à jour avec l'image designer: ${filename}`)

    return NextResponse.json({
      success: true,
      message: "Image du designer associée avec succès",
      filename: filename,
    })
  } catch (error: any) {
    console.error("❌ Erreur lors de l'association de l'image designer:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'association de l'image du designer",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
