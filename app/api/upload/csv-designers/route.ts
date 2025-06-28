import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 Import CSV Designers démarré")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📄 Fichier reçu: ${file.name} (${file.size} bytes)`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    // Lire le contenu du fichier CSV
    const csvContent = await file.text()
    const lines = csvContent.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: "Le fichier CSV doit contenir au moins un en-tête et une ligne de données" },
        { status: 400 },
      )
    }

    // Analyser l'en-tête
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
    console.log("📋 En-têtes détectés:", headers)

    // Vérifier que les colonnes requises sont présentes
    const requiredColumns = ["Nom", "imagedesigner"]
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col))

    if (missingColumns.length > 0) {
      return NextResponse.json(
        { success: false, error: `Colonnes manquantes: ${missingColumns.join(", ")}` },
        { status: 400 },
      )
    }

    // Traiter chaque ligne de données
    const designers = []
    let processedCount = 0
    let errorCount = 0

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))

        if (values.length !== headers.length) {
          console.warn(`⚠️ Ligne ${i + 1}: nombre de colonnes incorrect (${values.length} vs ${headers.length})`)
          errorCount++
          continue
        }

        // Créer l'objet designer
        const designer: any = {}
        headers.forEach((header, index) => {
          designer[header] = values[index] || ""
        })

        // Validation des données essentielles
        if (!designer.Nom) {
          console.warn(`⚠️ Ligne ${i + 1}: Nom manquant`)
          errorCount++
          continue
        }

        // Ajouter des métadonnées
        designer.createdAt = new Date()
        designer.updatedAt = new Date()
        designer.importedFrom = "csv-designers"

        designers.push(designer)
        processedCount++

        if (processedCount % 100 === 0) {
          console.log(`📊 ${processedCount} designers traités...`)
        }
      } catch (error) {
        console.error(`❌ Erreur ligne ${i + 1}:`, error)
        errorCount++
      }
    }

    console.log(`📊 Traitement terminé: ${processedCount} designers valides, ${errorCount} erreurs`)

    if (designers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucun designer valide trouvé dans le fichier" },
        { status: 400 },
      )
    }

    // Supprimer les anciens designers importés depuis CSV
    const deleteResult = await db.collection("designers").deleteMany({ importedFrom: "csv-designers" })
    console.log(`🗑️ ${deleteResult.deletedCount} anciens designers supprimés`)

    // Insérer les nouveaux designers
    const insertResult = await db.collection("designers").insertMany(designers)
    console.log(`✅ ${insertResult.insertedCount} designers insérés`)

    return NextResponse.json({
      success: true,
      message: `Import réussi: ${insertResult.insertedCount} designers importés`,
      stats: {
        processed: processedCount,
        inserted: insertResult.insertedCount,
        errors: errorCount,
        deleted: deleteResult.deletedCount,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur import CSV designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'import",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
