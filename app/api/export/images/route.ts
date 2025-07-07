import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"
import JSZip from "jszip"

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 Début de l'export d'images")

    // Connexion à MongoDB
    const { db } = await connectToDatabase()
    console.log("✅ Connexion MongoDB établie")

    // ÉTAPE 1 : Récupérer tous les documents luminaires pour classification
    console.log("📊 Récupération des données de classification...")
    const luminairesCollection = db.collection("luminaires")
    const allLuminaires = await luminairesCollection.find({}).toArray()
    console.log(`📋 ${allLuminaires.length} luminaires trouvés dans la base`)

    // ÉTAPE 2 : Créer les listes de classification
    const designerImages = new Set<string>()
    const luminaireImages = new Set<string>()

    // Parcourir chaque document luminaire pour classifier les images
    allLuminaires.forEach((luminaire, index) => {
      console.log(`🔍 Traitement luminaire ${index + 1}/${allLuminaires.length}: ${luminaire.nom || "Sans nom"}`)

      // Images de designers
      if (luminaire.designerImageFilename) {
        designerImages.add(luminaire.designerImageFilename)
        console.log(`  👤 Image designer: ${luminaire.designerImageFilename}`)
      }

      // Image principale du luminaire
      if (luminaire.filename) {
        luminaireImages.add(luminaire.filename)
        console.log(`  💡 Image principale: ${luminaire.filename}`)
      }

      // Images secondaires du luminaire
      if (Array.isArray(luminaire.images)) {
        luminaire.images.forEach((img: string) => {
          if (img) {
            luminaireImages.add(img)
            console.log(`  🖼️ Image secondaire: ${img}`)
          }
        })
      }
    })

    console.log(`📊 Classification terminée:`)
    console.log(`  👤 ${designerImages.size} images de designers`)
    console.log(`  💡 ${luminaireImages.size} images de luminaires`)

    // ÉTAPE 3 : Traitement des fichiers GridFS
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })
    const zip = new JSZip()

    console.log("📁 Récupération des fichiers depuis GridFS...")
    const files = await bucket.find({}).toArray()
    console.log(`📂 ${files.length} fichiers trouvés dans GridFS`)

    let processedCount = 0
    let designersCount = 0
    let luminairesCount = 0
    let skippedCount = 0

    // ÉTAPE 4 : Traiter chaque fichier avec la nouvelle logique de tri
    for (const file of files) {
      try {
        const originalFilename = file.filename
        let zipFilename: string

        // RÈGLE DE TRI SIMPLE : Si dans la liste designers → dossier designers/, sinon → dossier luminaires/
        if (designerImages.has(originalFilename)) {
          zipFilename = `designers/${originalFilename}`
          designersCount++
          console.log(`👤 ${originalFilename} → designers/`)
        } else {
          // TOUS les autres cas vont dans luminaires/
          zipFilename = `luminaires/${originalFilename}`
          luminairesCount++
          console.log(`💡 ${originalFilename} → luminaires/`)
        }

        // Lire le fichier depuis GridFS
        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        await new Promise<void>((resolve, reject) => {
          downloadStream.on("data", (chunk) => chunks.push(chunk))
          downloadStream.on("end", () => resolve())
          downloadStream.on("error", (error) => reject(error))
        })

        const fileBuffer = Buffer.concat(chunks)

        // Ajouter au ZIP avec le bon chemin
        zip.file(zipFilename, fileBuffer)
        processedCount++

        if (processedCount % 10 === 0) {
          console.log(`⏳ Progression: ${processedCount}/${files.length} fichiers traités`)
        }
      } catch (error) {
        console.error(`❌ Erreur traitement fichier ${file.filename}:`, error)
        skippedCount++
      }
    }

    console.log("📊 Résumé du traitement:")
    console.log(`  ✅ ${processedCount} fichiers traités`)
    console.log(`  👤 ${designersCount} fichiers dans designers/`)
    console.log(`  💡 ${luminairesCount} fichiers dans luminaires/`)
    console.log(`  ⚠️ ${skippedCount} fichiers ignorés (erreurs)`)

    // Générer le ZIP
    console.log("🗜️ Génération du fichier ZIP...")
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })
    console.log(`✅ ZIP généré (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB)`)

    // Retourner le ZIP
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_export_${new Date().toISOString().split("T")[0]}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("❌ Erreur lors de l'export d'images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export d'images",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}
