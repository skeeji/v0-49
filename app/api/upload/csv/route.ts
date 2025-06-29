import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import Papa from "papaparse"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/csv - Début du traitement")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier CSV reçu: ${file.name} (${file.size} bytes)`)

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
    const collection = db.collection("luminaires")

    // Traitement par batch
    const BATCH_SIZE = 500
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      console.log(`📦 Traitement batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)}`)

      const luminairesToInsert = batch
        .map((row, index) => {
          try {
            return {
              nom: row.nom || row.Nom || "",
              designer: row.designer || row.Designer || "",
              annee: Number.parseInt(row.annee || row.Annee) || new Date().getFullYear(),
              periode: row.periode || row.Periode || "",
              description: row.description || row.Description || "",
              materiaux: row.materiaux ? row.materiaux.split(",").map((m: string) => m.trim()) : [],
              couleurs: row.couleurs ? row.couleurs.split(",").map((c: string) => c.trim()) : [],
              dimensions: row.dimensions || row.Dimensions || "",
              "Nom du fichier": row["Nom du fichier"] || row.filename || "",
              specialite: row.specialite || row.Specialite || "",
              collaboration: row.collaboration || row.Collaboration || "",
              signe: row.signe || row.Signe || "",
              estimation: row.estimation || row.Estimation || "",
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

      if (luminairesToInsert.length > 0) {
        try {
          await collection.insertMany(luminairesToInsert)
          imported += luminairesToInsert.length
          console.log(`✅ Batch inséré: ${luminairesToInsert.length} luminaires`)
        } catch (error: any) {
          console.error(`❌ Erreur insertion batch:`, error)
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        }
      }
    }

    console.log(`✅ Import terminé: ${imported} luminaires importés`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} luminaires importés sur ${data.length} lignes traitées`,
      imported,
      processed: data.length,
      errors: errors.slice(0, 10),
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'import CSV:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'import",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
