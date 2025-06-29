import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("👨‍🎨 API /api/upload/csv-designers - Début de l'import designers")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier CSV designers reçu: ${file.name} (${file.size} bytes)`)

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    console.log(`📊 ${lines.length} lignes trouvées dans le CSV designers`)

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "Le fichier CSV doit contenir au moins une ligne d'en-tête et une ligne de données" },
        { status: 400 },
      )
    }

    // Parser le CSV manuellement
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ""
      let inQuotes = false
      let i = 0

      while (i < line.length) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"'
            i += 2
          } else {
            inQuotes = !inQuotes
            i++
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim())
          current = ""
          i++
        } else {
          current += char
          i++
        }
      }

      result.push(current.trim())
      return result
    }

    const headers = parseCSVLine(lines[0])
    console.log(`📋 En-têtes CSV designers:`, headers)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Vider la collection existante
    await db.collection("designers").deleteMany({})
    console.log("🗑️ Collection designers vidée")

    let imported = 0
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])

        // Créer l'objet designer
        const designer: any = {}

        headers.forEach((header, index) => {
          const value = values[index] || ""
          designer[header] = value
        })

        // Ajouter des champs techniques
        designer.imported_at = new Date()
        designer.line_number = i + 1

        await db.collection("designers").insertOne(designer)
        imported++

        if (imported % 100 === 0) {
          console.log(`📊 ${imported} designers importés...`)
        }
      } catch (error: any) {
        const errorMsg = `Ligne ${i + 1}: ${error.message}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    console.log(`✅ Import designers terminé: ${imported} designers importés, ${errors.length} erreurs`)

    return NextResponse.json({
      success: true,
      message: `${imported} designers importés avec succès`,
      imported,
      processed: lines.length - 1,
      errors: errors.slice(0, 50),
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique import CSV designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'import CSV designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
