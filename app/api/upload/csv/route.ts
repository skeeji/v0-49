import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
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
    const lines = text.split(/\r?\n/).filter((line) => line.trim())

    console.log(`📊 ${lines.length} lignes trouvées dans le CSV`)

    if (lines.length === 0) {
      return NextResponse.json({ error: "Le fichier CSV est vide" }, { status: 400 })
    }

    // Parser l'en-tête
    const headers = parseCSVLine(lines[0])
    console.log("📋 En-têtes détectés:", headers)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaires = []
    const errors: string[] = []

    // Parser chaque ligne
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])

        if (values.length !== headers.length) {
          errors.push(`Ligne ${i + 1}: Nombre de colonnes incorrect (${values.length} vs ${headers.length})`)
          continue
        }

        const luminaire: any = {}

        // Mapper chaque valeur avec son en-tête
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || ""
          luminaire[header] = value === "" ? "" : value // Garder les valeurs vides comme vides
        })

        // Parser l'année SEULEMENT si elle existe et n'est pas vide
        if (luminaire["Année"] && luminaire["Année"].trim() !== "") {
          const yearMatch = luminaire["Année"].toString().match(/\b(1[8-9]\d{2}|20\d{2})\b/)
          if (yearMatch) {
            luminaire.annee = Number.parseInt(yearMatch[0])
          }
        }

        // Ajouter les champs techniques
        luminaire.createdAt = new Date()
        luminaire.updatedAt = new Date()

        luminaires.push(luminaire)
      } catch (error: any) {
        errors.push(`Ligne ${i + 1}: ${error.message}`)
      }
    }

    console.log(`📊 ${luminaires.length} luminaires à importer`)

    if (luminaires.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Aucun luminaire valide trouvé",
        errors,
      })
    }

    // Insérer en base
    const result = await collection.insertMany(luminaires, { ordered: false })
    console.log(`✅ ${result.insertedCount} luminaires importés`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${result.insertedCount} luminaires importés sur ${lines.length - 1} lignes traitées`,
      imported: result.insertedCount,
      processed: lines.length - 1,
      errors,
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur import CSV:", error)
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
