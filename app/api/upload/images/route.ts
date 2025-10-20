import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🖼️ API /api/upload/images - Début de l'upload")

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]
    const designer = formData.get("designer") as string
    const forceDesignerImages = formData.get("forceDesignerImages") as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 ${files.length} fichiers reçus pour upload`)

    // Vérifier la taille totale des fichiers
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const totalSizeMB = Math.round(totalSize / 1024 / 1024)
    console.log(`📊 Taille totale: ${totalSizeMB}MB`)

    if (totalSize > 100 * 1024 * 1024) {
      // 100MB max par batch
      return NextResponse.json(
        {
          error: `Batch trop volumineux (${totalSizeMB}MB). Réduisez le nombre de fichiers.`,
          details: `Maximum autorisé: 100MB`,
        },
        { status: 413 },
      )
    }

    if (designer) {
      console.log(`👤 Designer spécifié: ${designer}`)
    }

    // Vérifier si c'est un upload depuis la page import
    const referer = request.headers.get("referer") || ""
    const isFromImportPage = referer.includes("/import")
    console.log(`🔍 Upload depuis page import: ${isFromImportPage}`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    let uploaded = 0
    let associated = 0
    const errors: string[] = []
    const filenames: string[] = []

    // Traitement séquentiel pour éviter les surcharges
    console.log(`📦 Traitement séquentiel de ${files.length} fichiers`)

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex]

      try {
        console.log(`📁 Traitement ${fileIndex + 1}/${files.length}: ${file.name} (${Math.round(file.size / 1024)}KB)`)

        // Vérifier si le fichier existe déjà
        const existingFile = await bucket.find({ filename: file.name }).toArray()
        if (existingFile.length > 0) {
          console.log(`⚠️ Fichier déjà existant: ${file.name}`)
          associated++
          filenames.push(file.name)
          continue
        }

        // Déterminer si c'est une image de designer
        let isDesignerImage = false

        if (forceDesignerImages === "true") {
          isDesignerImage = true
          console.log(`👤 Image forcée comme designer: ${file.name}`)
        } else if (designer && designer.trim() !== "") {
          isDesignerImage = true
          console.log(`👤 Image de designer (formulaire): ${file.name} pour ${designer}`)
        } else if (isFromImportPage) {
          const filename = file.name.toLowerCase()
          const designerKeywords = [
            "designer",
            "artiste",
            "artist",
            "portrait",
            "photo",
            "createur",
            "créateur",
            "auteur",
            "concepteur",
          ]
          isDesignerImage = designerKeywords.some((keyword) => filename.includes(keyword))
          console.log(`🔍 Analyse fichier "${file.name}": ${isDesignerImage ? "IMAGE DESIGNER" : "image luminaire"}`)
        }

        // Créer les métadonnées
        const metadata: any = {
          type: isDesignerImage ? "designer-image" : "luminaire-image",
          originalName: file.name,
          uploadDate: new Date(),
          uploadSource: isFromImportPage ? "import_page" : "form_upload",
        }

        if (isDesignerImage) {
          metadata.isDesignerImage = true
          metadata.designerImageSource = designer ? "form_upload" : "import_page"
          if (designer) {
            metadata.designer = designer
          }
          console.log(`👤 MARQUAGE: Image "${file.name}" marquée comme image de designer`)
        }

        // Upload du fichier
        const uploadStream = bucket.openUploadStream(file.name, { metadata })
        const buffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(buffer)

        await new Promise<void>((resolve, reject) => {
          uploadStream.end(uint8Array, (error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })

        uploaded++
        filenames.push(file.name)
        console.log(`✅ Upload réussi: ${file.name}`)

        // Associer l'image au luminaire correspondant (seulement pour les images de luminaires)
        if (!isDesignerImage) {
          try {
            // Essayer plusieurs champs pour l'association
            const queries = [
              { "Nom du fichier": file.name },
              { filename: file.name },
              { "Image luminaire (Nom du fichier)": file.name },
            ]

            let luminaireResult = null
            for (const query of queries) {
              luminaireResult = await db.collection("luminaires").updateOne(query, {
                $set: {
                  imageUploaded: true,
                  imageId: uploadStream.id,
                  updatedAt: new Date(),
                },
              })
              if (luminaireResult.matchedCount > 0) break
            }

            if (luminaireResult && luminaireResult.matchedCount > 0) {
              associated++
              console.log(`✅ Image "${file.name}" associée à un luminaire`)
            } else {
              console.log(`⚠️ Aucun luminaire trouvé pour l'image "${file.name}"`)
            }
          } catch (associationError) {
            console.log(`⚠️ Impossible d'associer ${file.name}:`, associationError)
          }
        }

        // Pause entre les fichiers pour éviter la surcharge
        if (fileIndex < files.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      } catch (error: any) {
        const errorMsg = `Erreur upload ${file.name}: ${error.message}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    console.log(`✅ Upload terminé: ${uploaded} uploadées, ${associated} associées`)

    return NextResponse.json({
      success: true,
      message: `Upload terminé: ${uploaded} images uploadées, ${associated} associées aux luminaires`,
      uploaded,
      associated,
      processed: files.length,
      filenames,
      errors: errors.slice(0, 10),
      totalErrors: errors.length,
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
