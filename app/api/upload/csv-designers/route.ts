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
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
    i++
  }

  result.push(current.trim())
  return result
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`👨‍🎨 Traitement du fichier designers: ${file.name}`)

    // Lire le fichier avec encoding UTF-8
    const buffer = await file.arrayBuffer()
    const text = new TextDecoder("utf-8").decode(buffer)
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)

    console.log(`📊 ${lines.length} lignes détectées dans le CSV designers`)

    if (lines.length === 0) {
      return NextResponse.json({ error: "Fichier CSV vide" }, { status: 400 })
    }

    // Parser l'en-tête
    const headers = parseCSVLine(lines[0])
    console.log(`📋 En-têtes CSV designers:`, headers)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Vider la collection existante
    await db.collection("designers").deleteMany({})
    console.log("🗑️ Collection designers vidée")

    let imported = 0
    let processed = 0
    const errors: string[] = []

    // Traiter chaque ligne de données
    for (let i = 1; i < lines.length; i++) {
      processed++
      const line = lines[i].trim()

      if (!line) continue

      try {
        const values = parseCSVLine(line)

        // Créer l'objet designer
        const designer: any = {
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        // Mapper chaque colonne
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || ""
          if (value) {
            designer[header] = value
          }
        })

        // Champs spéciaux pour la compatibilité
        designer.name = designer["Nom"] || designer["Designer"] || ""
        designer.dates = designer["Dates"] || designer["Période"] || ""
        designer.specialty = designer["Spécialité"] || ""
        designer.biography = designer["Biographie"] || ""

        // Vérifier qu'on a au moins un nom
        if (!designer.name) {
          errors.push(`Ligne ${i + 1}: Nom manquant`)
          continue
        }

        // Insérer en base
        await db.collection("designers").insertOne(designer)
        imported++

        if (imported % 100 === 0) {
          console.log(`📊 Progression designers: ${imported} importés`)
        }
      } catch (error: any) {
        const errorMsg = `Ligne ${i + 1}: ${error.message}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)

        if (errors.length > 50) {
          console.log("⚠️ Trop d'erreurs designers, arrêt de l'import")
          break
        }
      }
    }

    console.log(`✅ Import designers terminé: ${imported}/${processed} designers importés`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} designers importés sur ${processed} lignes traitées`,
      imported,
      processed,
      errors,
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur import CSV designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
