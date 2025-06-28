import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { parse } from "csv-parse/sync"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 Début de l'import CSV")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📄 Fichier reçu: ${file.name} (${file.size} bytes)`)

    const csvText = await file.text()
    console.log(`📄 Contenu CSV: ${csvText.length} caractères`)

    // Parser le CSV avec le bon délimiteur
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ";",
      trim: true,
      bom: true,
    })

    console.log(`📊 ${records.length} lignes parsées`)

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée trouvée dans le CSV" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    let imported = 0
    let totalErrors = 0
    const errors: string[] = []

    for (const [index, record] of records.entries()) {
      try {
        console.log(`📝 Traitement ligne ${index + 1}:`, record)

        // CORRECTION: Ne pas forcer l'année à 2025 si elle est vide
        let annee = null
        if (record["Année"] && record["Année"].trim() !== "") {
          const parsedYear = Number.parseInt(record["Année"].trim())
          if (!isNaN(parsedYear) && parsedYear > 0) {
            annee = parsedYear
          }
        }

        const luminaireData = {
          nom: record["Nom luminaire"] || "",
          designer: record["Artiste / Dates"] || "",
          annee: annee, // CORRECTION: Peut être null
          periode: record["Période"] || "",
          specialite: record["Spécialité"] || "",
          collaboration: record["Collaboration / Œuvre"] || "",
          signe: record["Signé"] || "",
          "Nom du fichier": record["Nom du fichier"] || "",
          dimensions: record["Dimensions"] || "",
          estimation: record["Estimation"] || "",
          materiaux: record["Matériaux"] ? record["Matériaux"].split(",").map((m: string) => m.trim()) : [],
          description: record["Description"] || "",
          images: [],
          couleurs: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        console.log(`💾 Données à insérer:`, {
          nom: luminaireData.nom,
          designer: luminaireData.designer,
          annee: luminaireData.annee, // Afficher la vraie valeur
          "Nom du fichier": luminaireData["Nom du fichier"],
        })

        const result = await collection.insertOne(luminaireData)
        console.log(`✅ Luminaire inséré avec l'ID: ${result.insertedId}`)
        imported++
      } catch (error: any) {
        console.error(`❌ Erreur ligne ${index + 1}:`, error.message)
        errors.push(`Ligne ${index + 1}: ${error.message}`)
        totalErrors++
      }
    }

    console.log(`📊 Import terminé: ${imported}/${records.length} réussis, ${totalErrors} erreurs`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} luminaires importés`,
      processed: records.length,
      imported,
      totalErrors,
      errors: errors.slice(0, 10), // Limiter à 10 erreurs pour l'affichage
    })
  } catch (error: any) {
    console.error("❌ Erreur critique dans l'import CSV:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'import CSV",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
