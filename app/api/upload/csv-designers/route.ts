import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import Papa from "papaparse"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 Début de l'import CSV designers...")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Lire le contenu du fichier
    const fileContent = await file.text()
    console.log(`📄 Fichier CSV lu: ${fileContent.length} caractères`)

    // Parser le CSV
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      encoding: "UTF-8",
    })

    if (parseResult.errors.length > 0) {
      console.error("❌ Erreurs parsing CSV:", parseResult.errors)
      return NextResponse.json(
        { success: false, error: "Erreur lors du parsing du CSV", details: parseResult.errors },
        { status: 400 },
      )
    }

    const data = parseResult.data as any[]
    console.log(`📊 ${data.length} lignes parsées`)

    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée trouvée dans le CSV" }, { status: 400 })
    }

    // Vérifier les colonnes requises
    const requiredColumns = ["Nom", "imagedesigner"]
    const headers = Object.keys(data[0])
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col))

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Colonnes manquantes: ${missingColumns.join(", ")}`,
          found: headers,
          required: requiredColumns,
        },
        { status: 400 },
      )
    }

    // Connexion à MongoDB
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("designers")

    // Supprimer les anciens designers
    await collection.deleteMany({})
    console.log("🗑️ Anciens designers supprimés")

    // Préparer les données pour l'insertion
    const designersToInsert = data.map((row, index) => ({
      Nom: row.Nom || "",
      imagedesigner: row.imagedesigner || "",
      slug: (row.Nom || "")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
      createdAt: new Date(),
      index: index,
    }))

    // Insérer les nouveaux designers
    const insertResult = await collection.insertMany(designersToInsert)
    console.log(`✅ ${insertResult.insertedCount} designers insérés`)

    return NextResponse.json({
      success: true,
      message: `${insertResult.insertedCount} designers importés avec succès`,
      imported: insertResult.insertedCount,
      processed: data.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur import CSV designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'import des designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
