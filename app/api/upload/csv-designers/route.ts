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

    // Lire le contenu du fichier avec un encoding correct
    const arrayBuffer = await file.arrayBuffer()
    const decoder = new TextDecoder("utf-8")
    const text = decoder.decode(arrayBuffer)

    console.log(`📊 Contenu CSV designers: ${text.length} caractères`)

    // Parser le CSV
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
    console.log(`📊 Nombre de lignes designers: ${lines.length}`)

    if (lines.length < 2) {
      return NextResponse.json({ error: "Fichier CSV vide ou invalide" }, { status: 400 })
    }

    // Parser les en-têtes
    const headerLine = lines[0]
    console.log(`📋 En-têtes designers: "${headerLine}"`)

    let delimiter = ";"
    let headers = headerLine.split(delimiter)

    if (headers.length < 2) {
      delimiter = ","
      headers = headerLine.split(delimiter)
    }

    headers = headers.map((h) => h.trim().replace(/^["']|["']$/g, ""))
    console.log(`📋 En-têtes designers détectés:`, headers)

    // Parser les données
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""))

      if (values.length >= headers.length) {
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })
        data.push(row)
      }
    }

    console.log(`📊 ${data.length} designers parsés du CSV`)
    console.log("📋 Premier designer:", JSON.stringify(data[0], null, 2))

    if (data.length === 0) {
      return NextResponse.json({ error: "Aucune donnée trouvée dans le CSV designers" }, { status: 400 })
    }

    // Connexion à MongoDB
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("designers")

    // Vider la collection avant import
    console.log("🗑️ Suppression des anciens designers...")
    await collection.deleteMany({})

    // Traitement par batch
    const BATCH_SIZE = 50
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      console.log(
        `📦 Traitement batch designers ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)}`,
      )

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
              biographie: "",
              dateNaissance: "",
              dateDeces: "",
              nationalite: "",
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          } catch (error: any) {
            const errorMsg = `Ligne ${i + index + 2}: ${error.message}`
            errors.push(errorMsg)
            console.error("❌", errorMsg)
            return null
          }
        })
        .filter(Boolean)

      if (designersToInsert.length > 0) {
        try {
          const result = await collection.insertMany(designersToInsert, { ordered: false })
          imported += result.insertedCount
          console.log(`✅ Batch designers inséré: ${result.insertedCount} (Total: ${imported})`)
        } catch (error: any) {
          console.error(`❌ Erreur insertion batch designers:`, error)
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        }
      }
    }

    console.log(`✅ Import designers terminé: ${imported} designers importés sur ${data.length} lignes`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} designers importés sur ${data.length} lignes traitées`,
      imported,
      processed: data.length,
      errors: errors.slice(0, 10),
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'import CSV designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'import designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
