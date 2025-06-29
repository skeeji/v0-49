import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { uploadToGridFS } from "@/lib/gridfs"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/images - Début du traitement")

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 ${files.length} fichiers reçus`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    const results = {
      uploaded: 0,
      associated: 0,
      errors: [] as string[],
    }

    // Traiter chaque fichier
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`📁 Fichier à uploader: ${file.name} ${file.size} bytes`)

      try {
        // Convertir le fichier en buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        // Upload vers GridFS
        const fileId = await uploadToGridFS(buffer, file.name, {
          contentType: file.type,
          originalName: file.name,
          size: file.size,
        })

        results.uploaded++

        // Essayer d'associer l'image à un luminaire
        const filename = file.name
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")

        // Rechercher le luminaire correspondant
        const luminaire = await db.collection("luminaires").findOne({
          $or: [
            { filename: filename },
            { "Nom du fichier": filename },
            { nom: nameWithoutExt },
            { filename: nameWithoutExt },
          ],
        })

        if (luminaire) {
          // Ajouter l'image au luminaire
          await db.collection("luminaires").updateOne(
            { _id: luminaire._id },
            {
              $push: {
                images: {
                  id: fileId.toString(),
                  filename: filename,
                  url: `/api/images/${fileId}`,
                },
              },
            },
          )
          results.associated++
          console.log(`✅ Image ${filename} associée au luminaire ${luminaire.nom}`)
        } else {
          console.log(`⚠️ Aucun luminaire trouvé pour l'image ${filename}`)
        }
      } catch (error: any) {
        console.error(`❌ Erreur upload ${file.name}:`, error)
        results.errors.push(`${file.name}: ${error.message}`)
      }
    }

    console.log(`✅ Upload terminé: ${results.uploaded} uploadées, ${results.associated} associées`)

    return NextResponse.json({
      success: true,
      message: `${results.uploaded} images uploadées, ${results.associated} associées`,
      uploaded: results.uploaded,
      associated: results.associated,
      errors: results.errors,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'upload d'images:", error)
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
