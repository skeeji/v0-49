import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📤 Début de l'upload d'images...")

    const formData = await request.formData()
    const images = formData.getAll("images") as File[]
    const designer = formData.get("designer") as string // Pour les images de designers spécifiques

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "Aucune image fournie" }, { status: 400 })
    }

    console.log(`📸 ${images.length} image(s) à uploader`)
    if (designer) {
      console.log(`👤 Images pour le designer: ${designer}`)
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    const uploadedFiles: string[] = []
    const errors: string[] = []

    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      console.log(`📸 Upload image ${i + 1}/${images.length}: ${image.name}`)

      try {
        // Validation
        if (!image.type.startsWith("image/")) {
          console.log(`⚠️ Fichier ignoré (pas une image): ${image.name}`)
          errors.push(`${image.name}: n'est pas une image`)
          continue
        }

        if (image.size > 10 * 1024 * 1024) {
          console.log(`⚠️ Fichier trop volumineux: ${image.name}`)
          errors.push(`${image.name}: fichier trop volumineux (max 10MB)`)
          continue
        }

        // Convertir le fichier en buffer
        const buffer = Buffer.from(await image.arrayBuffer())

        // Créer les métadonnées avec marquage pour les images de designers
        const metadata: any = {
          originalName: image.name,
          contentType: image.type,
          uploadDate: new Date(),
          size: image.size,
        }

        // MARQUAGE SPÉCIAL POUR LES IMAGES DE DESIGNERS
        // Si c'est uploadé depuis la page import avec la section "Images des designers"
        const referer = request.headers.get("referer") || ""
        if (referer.includes("/import") && !designer) {
          // Vérifier si c'est dans la section designers en analysant le nom du champ
          const fieldName = formData.get("fieldType") as string
          if (fieldName === "designers" || image.name.toLowerCase().includes("designer")) {
            metadata.isDesignerImage = true
            metadata.designerImageSource = "import_page"
            console.log(`👤 Image marquée comme image de designer: ${image.name}`)
          }
        }

        // Si un designer spécifique est fourni
        if (designer) {
          metadata.designer = designer
          metadata.isDesignerImage = true
          metadata.designerImageSource = "form_upload"
          console.log(`👤 Image associée au designer "${designer}": ${image.name}`)
        }

        // Upload vers GridFS
        const uploadStream = bucket.openUploadStream(image.name, { metadata })

        await new Promise<void>((resolve, reject) => {
          uploadStream.on("finish", () => {
            console.log(`✅ Image uploadée: ${image.name} (ID: ${uploadStream.id})`)
            uploadedFiles.push(image.name)
            resolve()
          })

          uploadStream.on("error", (error) => {
            console.error(`❌ Erreur upload ${image.name}:`, error)
            errors.push(`${image.name}: ${error.message}`)
            reject(error)
          })

          uploadStream.end(buffer)
        })
      } catch (error: any) {
        console.error(`❌ Erreur traitement ${image.name}:`, error)
        errors.push(`${image.name}: ${error.message}`)
      }
    }

    console.log(`✅ Upload terminé: ${uploadedFiles.length} succès, ${errors.length} erreurs`)

    return NextResponse.json({
      success: true,
      uploaded: uploadedFiles.length,
      filenames: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: `${uploadedFiles.length} image(s) uploadée(s) avec succès`,
    })
  } catch (error: any) {
    console.error("❌ Erreur générale upload images:", error)
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
