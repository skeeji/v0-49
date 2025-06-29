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
    console.log("👨‍🎨 API /api/upload/csv-designers - Début de l'import designers")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier CSV designers reçu: ${file.name} (${file.size} bytes)`)

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim())

    console.log(`📊 ${lines.length} lignes trouvées dans le CSV designers`)

    if (lines.length === 0) {
      return NextResponse.json({ error: "Le fichier CSV est vide" }, { status: 400 })
    }

    // Parser l'en-tête
    const headers = parseCSVLine(lines[0])
    console.log("📋 En-têtes designers détectés:", headers)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("designers")

    const designers = []
    const errors: string[] = []

    // Parser chaque ligne
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])

        if (values.length !== headers.length) {
          errors.push(`Ligne ${i + 1}: Nombre de colonnes incorrect`)
          continue
        }

        const designer: any = {}

        // Mapper chaque valeur avec son en-tête
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || ""
          designer[header] = value === "" ? "" : value
        })

        // Vérifier que le nom n'est pas vide
        if (!designer.Nom || designer.Nom.trim() === "") {
          errors.push(`Ligne ${i + 1}: Nom du designer manquant`)
          continue
        }

        designer.createdAt = new Date()
        designer.updatedAt = new Date()

        designers.push(designer)
      } catch (error: any) {
        errors.push(`Ligne ${i + 1}: ${error.message}`)
      }
    }

    console.log(`📊 ${designers.length} designers à importer`)

    if (designers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Aucun designer valide trouvé",
        errors,
      })
    }

    // Supprimer les anciens designers
    await collection.deleteMany({})

    // Insérer les nouveaux
    const result = await collection.insertMany(designers, { ordered: false })
    console.log(`✅ ${result.insertedCount} designers importés`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${result.insertedCount} designers importés sur ${lines.length - 1} lignes traitées`,
      imported: result.insertedCount,
      processed: lines.length - 1,
      errors,
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur import CSV designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'import CSV designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
