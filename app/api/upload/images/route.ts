import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { uploadFileToGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API /api/upload/images - Début de l'upload images")

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier image fourni" }, { status: 400 })
    }

    console.log(`📁 ${files.length} fichiers images reçus`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const luminairesCollection = db.collection("luminaires")

    let uploaded = 0
    let associated = 0
    const errors: string[] = []

    // Traiter par batch de 50 pour éviter les timeouts
    const BATCH_SIZE = 50
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE)
      console.log(`📦 Traitement batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)}`)

      for (const file of batch) {
        try {
          if (!file.type.startsWith("image/")) {
            errors.push(`${file.name}: n'est pas une image`)
            continue
          }

          // Upload vers GridFS
          const buffer = Buffer.from(await file.arrayBuffer())
          const result = await uploadFileToGridFS(client, DBNAME, buffer, file.name, file.type, {
            type: "luminaire-image",
            originalName: file.name,
            uploadDate: new Date(),
          })

          uploaded++

          // Associer à un luminaire si possible
          const luminaireName = file.name.replace(/\.[^/.]+$/, "").replace(/^luminaire_/, "")
          const luminaire = await luminairesCollection.findOne({
            $or: [
              { filename: file.name },
              { "Nom du fichier": file.name },
              { nom: { $regex: new RegExp(luminaireName, "i") } },
            ],
          })

          if (luminaire) {
            await luminairesCollection.updateOne(
              { _id: luminaire._id },
              {
                $addToSet: { images: file.name },
                $set: { updatedAt: new Date() },
              },
            )
            associated++
            console.log(`🔗 Image associée: ${file.name} -> ${luminaire.nom}`)
          }
        } catch (error: any) {
          errors.push(`${file.name}: ${error.message}`)
          console.error(`❌ Erreur upload ${file.name}:`, error)
        }
      }

      // Log de progression
      console.log(`📊 Progression: ${uploaded}/${files.length} images uploadées`)
    }

    console.log(`✅ Upload terminé: ${uploaded} images uploadées, ${associated} associées`)

    return NextResponse.json({
      success: true,
      message: `${uploaded} images uploadées, ${associated} associées`,
      uploaded,
      associated,
      errors: errors.slice(0, 10),
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'upload images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'upload des images",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
