import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { csvData, chunkIndex, totalChunks, headers } = body

    console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} - ${csvData.length} lignes`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i]

      try {
        // Créer un objet avec les en-têtes comme clés
        const luminaire: any = {}
        headers.forEach((header: string, index: number) => {
          luminaire[header] = row[index] || ""
        })

        // IMPORTANT: Extraire et normaliser les champs clés
        const nomLuminaire = luminaire["Nom luminaire"] || luminaire.nom || ""
        const artisteDates = luminaire["Artiste / Dates"] || luminaire.designer || ""
        const annee = luminaire["Année"] || luminaire.annee || ""
        const categorie = luminaire["Catégorie"] || luminaire.categorie || ""
        const specialite = luminaire["Spécialité"] || luminaire.periode || ""
        const collaboration = luminaire["Collaboration / Œuvre"] || luminaire.collaboration || ""
        const description = luminaire["Description"] || luminaire.description || ""
        const signe = luminaire["Signé"] || luminaire.signe || ""
        const dimensions = luminaire["Dimensions"] || luminaire.dimensions || ""
        const materiaux = luminaire["Matériaux"] || luminaire.materiaux || ""
        const estimation = luminaire["Estimation"] || luminaire.estimation || ""
        const editeur = luminaire["Editeur"] || luminaire.editeur || ""
        const lienSiteMarchand = luminaire["Lien site marchand"] || luminaire.lienSiteMarchand || ""
        const etiquette = luminaire["Etiquette"] || luminaire.etiquette || ""
        const bibliographie = luminaire["Bibliographie"] || luminaire.bibliographie || ""

        // CORRECTION CRITIQUE: Extraire le nom du fichier image
        const imageFilename =
          luminaire["Image luminaire (Nom du fichier)"] || luminaire["Nom du fichier"] || luminaire.filename || ""

        // Nettoyer le nom du fichier (enlever espaces, guillemets, etc.)
        const cleanFilename = imageFilename.trim().replace(/^["']|["']$/g, "")

        // Parser l'année en nombre si possible
        let anneeNum = null
        if (annee) {
          const parsed = Number.parseInt(annee.toString().trim())
          if (!isNaN(parsed) && parsed > 1000 && parsed < 2100) {
            anneeNum = parsed
          }
        }

        // Créer le document à insérer avec TOUS les champs
        const document = {
          // Champs normalisés
          nom: nomLuminaire,
          "Nom luminaire": nomLuminaire,
          designer: artisteDates,
          "Artiste / Dates": artisteDates,
          annee: anneeNum,
          Année: annee,
          categorie: categorie,
          Catégorie: categorie,
          periode: specialite,
          Spécialité: specialite,
          collaboration: collaboration,
          "Collaboration / Œuvre": collaboration,
          description: description,
          Description: description,
          signe: signe,
          Signé: signe,
          dimensions: dimensions,
          Dimensions: dimensions,
          materiaux: materiaux,
          Matériaux: materiaux,
          estimation: estimation,
          Estimation: estimation,
          editeur: editeur,
          Editeur: editeur,
          lienSiteMarchand: lienSiteMarchand,
          "Lien site marchand": lienSiteMarchand,
          etiquette: etiquette,
          Etiquette: etiquette,
          bibliographie: bibliographie,
          Bibliographie: bibliographie,

          // CORRECTION CRITIQUE: Sauvegarder le nom du fichier
          filename: cleanFilename,
          "Nom du fichier": cleanFilename,
          "Image luminaire (Nom du fichier)": cleanFilename,

          // Métadonnées
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        // Log pour vérifier
        if (cleanFilename) {
          console.log(`✅ Luminaire "${nomLuminaire}" -> filename: "${cleanFilename}"`)
        }

        // Insérer dans MongoDB
        await collection.insertOne(document)
        imported++
      } catch (error: any) {
        const errorMsg = `Ligne ${i + 1}: ${error.message}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks}: ${imported}/${csvData.length} importés`)

    return NextResponse.json({
      success: true,
      imported,
      processed: csvData.length,
      errors: errors.slice(0, 5),
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/upload/csv-stream:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'import du chunk",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
