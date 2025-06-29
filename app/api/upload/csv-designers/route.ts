import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import Papa from "papaparse"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("👨‍🎨 API /api/upload/csv-designers - Début du traitement")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier CSV designers reçu: ${file.name} (${file.size} bytes)`)

    // Lire le contenu du fichier
    const text = await file.text()
    console.log(`📊 Contenu CSV: ${text.length} caractères`)

    // Parser le CSV avec Papa Parse
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";", // Utiliser point-virgule comme délimiteur
      quoteChar: '"',
      escapeChar: '"',
      transformHeader: (header) => header.trim(),
    })

    if (parseResult.errors.length > 0) {
      console.log("⚠️ Erreurs de parsing:", parseResult.errors.slice(0, 5))
    }

    const data = parseResult.data as any[]
    console.log(`📊 ${data.length} lignes parsées`)

    if (data.length === 0) {
      return NextResponse.json({ error: "Aucune donnée trouvée dans le CSV" }, { status: 400 })
    }

    // Connexion à MongoDB
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("designers")

    // Traitement par batch
    const BATCH_SIZE = 500
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      console.log(`📦 Traitement batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)}`)

      const designersToInsert = batch
        .map((row, index) => {
          try {
            return {
              nom: row.nom || row.Nom || "",
              biographie: row.biographie || row.Biographie || "",
              dateNaissance: row.dateNaissance || row.DateNaissance || "",
              dateDeces: row.dateDeces || row.DateDeces || "",
              nationalite: row.nationalite || row.Nationalite || "",
              imagedesigner: row.imagedesigner || row.ImageDesigner || "",
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          } catch (error: any) {
            errors.push(`Ligne ${i + index + 1}: ${error.message}`)
            return null
          }
        })
        .filter(Boolean)

      if (designersToInsert.length > 0) {
        try {
          await collection.insertMany(designersToInsert)
          imported += designersToInsert.length
          console.log(`✅ Batch inséré: ${designersToInsert.length} designers`)
        } catch (error: any) {
          console.error(`❌ Erreur insertion batch:`, error)
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        }
      }
    }

    console.log(`✅ Import terminé: ${imported} designers importés`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} designers importés sur ${data.length} lignes traitées`,
      imported,
      processed: data.length,
      errors: errors.slice(0, 10),
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'import designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'import des designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
