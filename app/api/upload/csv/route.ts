import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/csv - Début de l'import CSV")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier CSV reçu: ${file.name} (${file.size} bytes)`)

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    console.log(`📊 ${lines.length} lignes trouvées dans le CSV`)

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "Le fichier CSV doit contenir au moins une ligne d'en-tête et une ligne de données" },
        { status: 400 },
      )
    }

    // Parser le CSV manuellement pour gérer les guillemets et virgules
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
            // Double quote = escaped quote
            current += '"'
            i += 2
          } else {
            // Toggle quote state
            inQuotes = !inQuotes
            i++
          }
        } else if (char === "," && !inQuotes) {
          // End of field
          result.push(current.trim())
          current = ""
          i++
        } else {
          current += char
          i++
        }
      }

      // Add the last field
      result.push(current.trim())
      return result
    }

    const headers = parseCSVLine(lines[0])
    console.log(`📋 En-têtes CSV:`, headers)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Vider la collection existante
    await db.collection("luminaires").deleteMany({})
    console.log("🗑️ Collection luminaires vidée")

    let imported = 0
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])

        if (values.length !== headers.length) {
          console.warn(`⚠️ Ligne ${i + 1}: ${values.length} valeurs pour ${headers.length} colonnes`)
        }

        // Créer l'objet luminaire en préservant EXACTEMENT les valeurs du CSV
        const luminaire: any = {}

        headers.forEach((header, index) => {
          const value = values[index] || ""
          luminaire[header] = value // Garder la valeur exacte, même si vide
        })

        // Ajouter des champs techniques
        luminaire.imported_at = new Date()
        luminaire.line_number = i + 1

        // Traitement spécial pour l'année SEULEMENT si la valeur existe et est numérique
        if (luminaire["Année"] && luminaire["Année"].trim()) {
          const yearStr = luminaire["Année"].toString().trim()
          const yearMatch = yearStr.match(/(\d{4})/)
          if (yearMatch) {
            const year = Number.parseInt(yearMatch[1])
            if (year >= 1000 && year <= 2100) {
              luminaire.annee = year
            }
          }
        }

        await db.collection("luminaires").insertOne(luminaire)
        imported++

        if (imported % 1000 === 0) {
          console.log(`📊 ${imported} luminaires importés...`)
        }
      } catch (error: any) {
        const errorMsg = `Ligne ${i + 1}: ${error.message}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    console.log(`✅ Import terminé: ${imported} luminaires importés, ${errors.length} erreurs`)

    return NextResponse.json({
      success: true,
      message: `${imported} luminaires importés avec succès`,
      imported,
      processed: lines.length - 1,
      errors: errors.slice(0, 100), // Limiter les erreurs retournées
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique import CSV:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'import CSV",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
