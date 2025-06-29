import { type NextRequest, NextResponse } from "next/server"
import { uploadToGridFS } from "@/lib/gridfs"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📤 API /api/upload/images - Début du traitement")

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 ${files.length} fichiers reçus`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    const results = {
      uploaded: 0,
      associated: 0,
      errors: [] as string[],
      uploadedFiles: [] as string[],
    }

    // Charger tous les luminaires pour l'association
    const luminaires = await db.collection("luminaires").find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires trouvés pour association`)

    for (const file of files) {
      try {
        console.log(`📁 Fichier à uploader: ${file.name} ${file.size} bytes`)

        // Convertir le fichier en buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        // Upload vers GridFS
        const fileId = await uploadToGridFS(buffer, file.name, file.type)

        results.uploaded++
        results.uploadedFiles.push(file.name)

        // Essayer d'associer l'image à un luminaire
        const baseFilename = file.name.replace(/\.[^/.]+$/, "")

        const matchingLuminaire = luminaires.find((lum) => {
          const lumFilename = lum["Nom du fichier"] || lum.filename || ""
          const lumBaseFilename = lumFilename.replace(/\.[^/.]+$/, "")
          return lumBaseFilename === baseFilename
        })

        if (matchingLuminaire) {
          // Associer l'image au luminaire
          await db.collection("luminaires").updateOne(
            { _id: matchingLuminaire._id },
            {
              $set: {
                images: [file.name],
                imageId: fileId,
                updatedAt: new Date(),
              },
            },
          )

          results.associated++
          console.log(`🔗 Image ${file.name} associée au luminaire: ${matchingLuminaire.nom}`)
        } else {
          console.log(`⚠️ Aucun luminaire trouvé pour l'image: ${file.name}`)
        }
      } catch (error: any) {
        console.error(`❌ Erreur upload ${file.name}:`, error)
        results.errors.push(`${file.name}: ${error.message}`)
      }
    }

    console.log(`✅ Upload terminé: ${results.uploaded} fichiers uploadés, ${results.associated} associés`)

    return NextResponse.json({
      success: true,
      message: `${results.uploaded} images uploadées, ${results.associated} associées`,
      uploaded: results.uploaded,
      associated: results.associated,
      uploadedFiles: results.uploadedFiles,
      errors: results.errors,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
