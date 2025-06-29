import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

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

    // Compter les lignes réelles
    const lines = text.split("\n").filter((line) => line.trim().length > 0)
    console.log(`📊 Nombre de lignes dans le fichier: ${lines.length}`)

    // Parser le CSV manuellement
    const headers = lines[0].split(";").map((h) => h.trim().replace(/"/g, ""))
    console.log(`📋 En-têtes détectés:`, headers)

    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(";").map((v) => v.trim().replace(/"/g, ""))
      if (values.length >= headers.length) {
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })
        data.push(row)
      }
    }

    console.log(`📊 ${data.length} lignes parsées du CSV`)

    if (data.length === 0) {
      return NextResponse.json({ error: "Aucune donnée trouvée dans le CSV" }, { status: 400 })
    }

    // Afficher un échantillon des données
    console.log("📋 Premier enregistrement:", data[0])

    // Connexion à MongoDB
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("designers")

    // Vider la collection avant import
    console.log("🗑️ Suppression des anciens designers...")
    await collection.deleteMany({})

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
            const nom = (row["Nom"] || row["nom"] || "").toString().trim()
            const imagedesigner = (row["imagedesigner"] || row["image"] || "").toString().trim()

            if (!nom) {
              errors.push(`Ligne ${i + index + 2}: nom manquant`)
              return null
            }

            return {
              nom: nom,
              imagedesigner: imagedesigner,
              biographie: (row["biographie"] || row["Biographie"] || "").toString().trim(),
              dateNaissance: (row["dateNaissance"] || row["DateNaissance"] || "").toString().trim(),
              dateDeces: (row["dateDeces"] || row["DateDeces"] || "").toString().trim(),
              nationalite: (row["nationalite"] || row["Nationalite"] || "").toString().trim(),
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          } catch (error: any) {
            errors.push(`Ligne ${i + index + 2}: ${error.message}`)
            return null
          }
        })
        .filter(Boolean)

      if (designersToInsert.length > 0) {
        try {
          await collection.insertMany(designersToInsert, { ordered: false })
          imported += designersToInsert.length
          console.log(`✅ Batch inséré: ${designersToInsert.length} designers (Total: ${imported})`)
        } catch (error: any) {
          console.error(`❌ Erreur insertion batch:`, error)
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        }
      }
    }

    console.log(`✅ Import terminé: ${imported} designers importés sur ${data.length} lignes`)

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
