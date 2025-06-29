import { type NextRequest, NextResponse } from "next/server"
import { uploadToGridFS } from "@/lib/gridfs"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API /api/upload/images - Début upload images")

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      console.log("❌ Aucun fichier image fourni")
      return NextResponse.json(
        {
          success: false,
          error: "Aucun fichier image fourni",
        },
        { status: 400 },
      )
    }

    console.log(`📁 ${files.length} fichiers images reçus`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    let uploaded = 0
    let associated = 0
    const errors: string[] = []

    // Traiter par batch de 50 pour éviter les timeouts
    const batchSize = 50
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      console.log(
        `📦 Traitement batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)} (${batch.length} fichiers)`,
      )

      for (const file of batch) {
        try {
          if (!file.type.startsWith("image/")) {
            errors.push(`${file.name}: Type de fichier invalide (${file.type})`)
            continue
          }

          // Convertir en buffer
          const buffer = Buffer.from(await file.arrayBuffer())

          // Upload vers GridFS
          const fileId = await uploadToGridFS(buffer, file.name, {
            contentType: file.type,
            category: "luminaire_image",
            originalName: file.name,
          })

          uploaded++

          // Essayer d'associer l'image à un luminaire
          // Extraire le numéro du nom de fichier (ex: luminaire_1234.jpg -> 1234)
          const match = file.name.match(/luminaire[_-]?(\d+)/i)
          if (match) {
            const numero = match[1]

            const result = await db.collection("luminaires").updateOne(
              {
                $or: [
                  { numero: numero },
                  { numero: Number.parseInt(numero) },
                  { id: numero },
                  { id: Number.parseInt(numero) },
                ],
              },
              {
                $set: {
                  image: file.name,
                  imageId: fileId.toString(),
                },
              },
            )

            if (result.matchedCount > 0) {
              associated++
              console.log(`✅ Image ${file.name} associée au luminaire ${numero}`)
            } else {
              console.log(`⚠️ Image ${file.name} uploadée mais pas de luminaire trouvé pour le numéro ${numero}`)
            }
          } else {
            console.log(`⚠️ Image ${file.name} uploadée mais impossible d'extraire le numéro`)
          }
        } catch (error: any) {
          console.error(`❌ Erreur upload ${file.name}:`, error)
          errors.push(`${file.name}: ${error.message}`)
        }
      }

      // Petite pause entre les batches
      if (i + batchSize < files.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(`✅ Upload terminé: ${uploaded} images uploadées, ${associated} associées`)

    return NextResponse.json({
      success: true,
      message: `${uploaded} images uploadées, ${associated} associées`,
      uploaded,
      associated,
      errors,
      total: files.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique upload images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'upload des images",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
