import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

async function uploadFile(bucket: GridFSBucket, file: File): Promise<string> {
  const uploadStream = bucket.openUploadStream(file.name)
  const buffer = await file.arrayBuffer()
  await new Promise<void>((resolve, reject) => {
    uploadStream.end(new Uint8Array(buffer), (error) => (error ? reject(error) : resolve()))
  })
  return file.name
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const luminaireImage = formData.get("luminaireImage") as File | null
    const designerImage = formData.get("designerImage") as File | null

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const designersCollection = db.collection("designers")
    const luminairesCollection = db.collection("luminaires")

    // 1. Gérer le designer et son image
    const designerName = formData.get("artist") as string
    if (designerName) {
      const updatePayload: any = { $set: { Nom: designerName } }
      if (designerImage) {
        updatePayload.$set.imagedesigner = await uploadFile(bucket, designerImage)
      }
      await designersCollection.updateOne({ Nom: designerName }, updatePayload, { upsert: true })
    }

    // 2. Créer le document du luminaire
    const luminaireData: any = { createdAt: new Date(), updatedAt: new Date() }
    formData.forEach((value, key) => {
      if (!["luminaireImage", "designerImage"].includes(key)) {
        luminaireData[key] = value
      }
    })

    // Conversion des types appropriés
    if (luminaireData.annee) luminaireData.annee = Number(luminaireData.annee)
    if (luminaireData.materials) {
      luminaireData.materiaux = luminaireData.materials
        .split(",")
        .map((m: string) => m.trim())
        .filter(Boolean)
    }

    // Ajouter les champs compatibles CSV pour la cohérence
    luminaireData["Nom luminaire"] = luminaireData.nom
    luminaireData["Artiste / Dates"] = luminaireData.artist
    luminaireData.designer = luminaireData.artist
    luminaireData["Année"] = luminaireData.annee?.toString()
    luminaireData["Spécialité"] = luminaireData.specialty
    luminaireData.periode = luminaireData.specialty
    luminaireData["Collaboration / Œuvre"] = luminaireData.collaboration
    luminaireData["Signé"] = luminaireData.signed
    luminaireData.signe = luminaireData.signed

    const luminaireResult = await luminairesCollection.insertOne(luminaireData)
    const newLuminaireId = luminaireResult.insertedId

    // 3. Gérer l'image du luminaire et l'associer
    if (luminaireImage) {
      const filename = await uploadFile(bucket, luminaireImage)
      await luminairesCollection.updateOne(
        { _id: newLuminaireId },
        {
          $set: {
            images: [filename],
            filename,
            "Nom du fichier": filename,
            updatedAt: new Date(),
          },
        },
      )
    }

    return NextResponse.json({ success: true, message: "Opération réussie", id: newLuminaireId })
  } catch (error: any) {
    console.error("❌ Erreur création complète:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
