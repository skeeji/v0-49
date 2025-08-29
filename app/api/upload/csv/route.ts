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
        // Double quote inside quoted field
        current += '"'
        i += 2
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
        i++
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
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
    console.log("📥 API /api/upload/csv - Début de l'import")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier reçu: ${file.name} (${file.size} bytes)`)

    // Lire le fichier avec l'encoding UTF-8
    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    console.log(`📊 ${lines.length} lignes trouvées dans le CSV`)

    if (lines.length === 0) {
      return NextResponse.json({ error: "Fichier CSV vide" }, { status: 400 })
    }

    // Parser l'en-tête
    const headers = parseCSVLine(lines[0])
    console.log("📋 En-têtes détectés:", headers)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    let imported = 0
    let processed = 0
    const errors: string[] = []

    // Traiter chaque ligne
    for (let i = 1; i < lines.length; i++) {
      try {
        processed++
        const line = lines[i].trim()
        if (!line) continue

        const values = parseCSVLine(line)

        // Créer l'objet luminaire en gardant les valeurs exactes du CSV
        const luminaire: any = {
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        // Mapper chaque colonne SANS MODIFICATION - garder les noms exacts du CSV exporté
        headers.forEach((header, index) => {
          const value = values[index] || ""
          luminaire[header] = value.trim()
        })

        // Extraire l'année si présente dans la colonne "Année"
        if (luminaire["Année"]) {
          const yearMatch = luminaire["Année"].toString().match(/\b(1[8-9]\d{2}|20\d{2})\b/)
          if (yearMatch) {
            luminaire.annee = Number.parseInt(yearMatch[0])
          }
        }

        // Ajouter les champs de mapping pour compatibilité avec l'interface existante
        luminaire.nom = luminaire["Nom luminaire"] || ""
        luminaire.designer = luminaire["Artiste / Dates"] || ""
        luminaire.filename = luminaire["Image luminaire (Nom du fichier)"] || luminaire["Nom du fichier"] || ""
        luminaire.signe = luminaire["Signé"] || ""
        luminaire.editeur = luminaire["Editeur"] || ""
        luminaire.description = luminaire["Description"] || ""
        luminaire.dimensions = luminaire["Dimensions"] || ""
        luminaire.estimation = luminaire["Estimation"] || ""

        // Mapper les nouveaux champs du CSV exporté
        luminaire.categorie = luminaire["Catégorie"] || ""
        luminaire.specialite = luminaire["Spécialité"] || ""
        luminaire.collaboration = luminaire["Collaboration / Œuvre"] || ""
        luminaire.materiaux = luminaire["Matériaux"] || ""
        luminaire.designerImageFilename = luminaire["Image designer (imagedesigner)"] || ""

        await collection.insertOne(luminaire)
        imported++

        if (imported % 1000 === 0) {
          console.log(`📊 ${imported} luminaires importés...`)
        }
      } catch (error: any) {
        errors.push(`Ligne ${i + 1}: ${error.message}`)
        if (errors.length > 100) break // Limiter les erreurs
      }
    }

    console.log(`✅ Import terminé: ${imported}/${processed} luminaires importés`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} luminaires importés sur ${processed} lignes traitées`,
      imported,
      processed,
      errors,
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique import CSV:", error)
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
