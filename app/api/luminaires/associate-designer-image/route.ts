import { type NextRequest, NextResponse } from "next/server"
import { GridFSBucket, ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get("image") as File | null
    const luminaireId = formData.get("luminaireId") as string | null

    if (!imageFile || !luminaireId || !ObjectId.isValid(luminaireId)) {
      return NextResponse.json(
        { success: false, error: "Données invalides : image ou ID du luminaire manquant." },
        { status: 400 },
      )
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" }) // Utiliser le bucket "uploads"

    // Vérifier si un fichier avec le même nom existe déjà pour éviter les doublons
    const existingFile = await bucket.find({ filename: imageFile.name }).limit(1).toArray()
    if (existingFile.length > 0) {
      console.log(`⚠️ Fichier designer déjà existant, association directe: ${imageFile.name}`)
    } else {
      const uploadStream = bucket.openUploadStream(imageFile.name, {
        contentType: imageFile.type,
        metadata: { type: "designer-image", relatedLuminaireId: luminaireId },
      })
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      await new Promise((resolve, reject) => {
        uploadStream.end(buffer, (error: any, file: any) => (error ? reject(error) : resolve(file)))
      })
      console.log(`✅ Image designer uploadée sur GridFS: ${imageFile.name}`)
    }

    // Mettre à jour le document luminaire
    const result = await db
      .collection("luminaires")
      .updateOne(
        { _id: new ObjectId(luminaireId) },
        { $set: { designerImageFilename: imageFile.name, updatedAt: new Date() } },
      )

    if (result.modifiedCount === 0) {
      console.warn(`⚠️ Le document luminaire ${luminaireId} n'a pas été trouvé ou mis à jour.`)
    }

    return NextResponse.json({ success: true, filename: imageFile.name })
  } catch (error: any) {
    console.error("❌ Erreur dans /api/luminaires/associate-designer-image:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur.", details: error.message }, { status: 500 })
  }
}
