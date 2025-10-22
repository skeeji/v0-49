import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

interface CSVRow {
  [key: string]: string
}

export async function POST(request: NextRequest) {
  try {
    const { csvData, chunkIndex, totalChunks, headers } = await request.json()

    console.log(`📦 Traitement chunk ${chunkIndex + 1}/${totalChunks}, ${csvData.length} lignes`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i]

      try {
        // Créer un objet avec les en-têtes comme clés
        const luminaireData: CSVRow = {}
        headers.forEach((header: string, index: number) => {
          luminaireData[header] = row[index] || ""
        })

        // Extraire les champs principaux avec toutes les variantes possibles
        const nom = luminaireData["Nom luminaire"] || luminaireData.nom || luminaireData["Nom"] || ""
        const designer =
          luminaireData["Artiste / Dates"] ||
          luminaireData.designer ||
          luminaireData["Designer (Artiste / Dates)"] ||
          luminaireData.Designer ||
          ""

        // Si pas de nom, on skip
        if (!nom || nom.trim() === "") {
          skipped++
          continue
        }

        // Vérifier si le luminaire existe déjà (par nom ET designer pour éviter les doublons)
        const existing = await collection.findOne({
          $or: [
            { nom: nom, designer: designer },
            { "Nom luminaire": nom, "Artiste / Dates": designer },
          ],
        })

        if (existing) {
          console.log(`⏭️ Luminaire déjà existant: ${nom}`)
          skipped++
          continue
        }

        // Préparer le document
        const document: any = {
          nom: nom,
          designer: designer,
          signe: luminaireData["Signé"] || luminaireData.signe || "",
          annee: luminaireData["Année"] || luminaireData.annee || "",
          categorie: luminaireData["Catégorie"] || luminaireData.categorie || "",
          editeur: luminaireData["Editeur"] || luminaireData.editeur || "",
          periode: luminaireData["Spécialité"] || luminaireData.periode || luminaireData.Spécialité || "",
          collaboration:
            luminaireData["Collaboration / Œuvre"] ||
            luminaireData.collaboration ||
            luminaireData["Collaboration"] ||
            "",
          description: luminaireData["Description"] || luminaireData.description || "",
          dimensions: luminaireData["Dimensions"] || luminaireData.dimensions || "",
          estimation: luminaireData["Estimation"] || luminaireData.estimation || luminaireData.prix || "",
          lienSiteMarchand: luminaireData["Lien site marchand"] || luminaireData.lienSiteMarchand || "",
          etiquette: luminaireData["Etiquette"] || luminaireData.etiquette || "",
          bibliographie: luminaireData["Bibliographie"] || luminaireData.bibliographie || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        // Gérer les matériaux
        const materiauxRaw = luminaireData["Matériaux"] || luminaireData.materiaux || ""
        if (materiauxRaw && materiauxRaw.trim() !== "") {
          document.materiaux = materiauxRaw.split(";").map((m: string) => m.trim())
        }

        // Gérer le nom de fichier image
        const filename =
          luminaireData["Image luminaire (Nom du fichier)"] ||
          luminaireData["Nom du fichier"] ||
          luminaireData.filename ||
          ""
        if (filename && filename.trim() !== "") {
          document.filename = filename.trim()
          document["Nom du fichier"] = filename.trim()
          document["Image luminaire (Nom du fichier)"] = filename.trim()
        }

        // Gérer l'image designer
        const designerImage =
          luminaireData["Image designer (imagedesigner)"] || luminaireData.designerImageFilename || ""
        if (designerImage && designerImage.trim() !== "") {
          document.designerImageFilename = designerImage.trim()
        }

        // Conserver les colonnes originales pour compatibilité
        Object.keys(luminaireData).forEach((key) => {
          if (!document[key] && luminaireData[key] && luminaireData[key].trim() !== "") {
            document[key] = luminaireData[key].trim()
          }
        })

        await collection.insertOne(document)
        imported++
      } catch (error: any) {
        const errorMsg = `Ligne ${i + 1}: ${error.message}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks}: ${imported} importés, ${skipped} skipped`)

    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} traité`,
      imported,
      skipped,
      processed: csvData.length,
      errors: errors.slice(0, 5),
    })
  } catch (error: any) {
    console.error("❌ Erreur lors du traitement du chunk:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du traitement du chunk",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
