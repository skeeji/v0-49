import { type NextRequest, NextResponse } from "next/server"

// Simulation d'une base de données
const designers: any[] = []

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

    // Parser le CSV (simulation simple)
    const lines = fileContent.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(";").map((h) => h.replace(/"/g, "").trim())

    const data = lines.slice(1).map((line) => {
      const values = line.split(";").map((v) => v.replace(/"/g, "").trim())
      const record: any = {}
      headers.forEach((header, index) => {
        record[header] = values[index] || ""
      })
      return record
    })

    console.log(`📊 ${data.length} lignes parsées`)

    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée trouvée dans le CSV" }, { status: 400 })
    }

    // Vérifier les colonnes requises
    const requiredColumns = ["Nom", "imagedesigner"]
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

    // Supprimer les anciens designers
    designers.length = 0
    console.log("🗑️ Anciens designers supprimés")

    // Préparer les données pour l'insertion
    const designersToInsert = data.map((row, index) => ({
      _id: Date.now().toString() + index,
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
    designers.push(...designersToInsert)

    console.log(`✅ ${designersToInsert.length} designers insérés`)

    return NextResponse.json({
      success: true,
      message: `${designersToInsert.length} designers importés avec succès`,
      imported: designersToInsert.length,
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
