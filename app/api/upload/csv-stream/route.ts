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

// API pour traiter le CSV par petits chunks
export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/csv-stream - Début du streaming CSV")

    const body = await request.json()
    const { csvData, chunkIndex, totalChunks, headers } = body

    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json({ error: "Données CSV invalides" }, { status: 400 })
    }

    console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks}: ${csvData.length} lignes`)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    let imported = 0
    const errors: string[] = []
    const documents = []

    // Traiter chaque ligne du chunk
    for (let i = 0; i < csvData.length; i++) {
      try {
        const values = csvData[i]
        if (!values || values.length === 0) continue

        // Créer l'objet luminaire
        const luminaire: any = {
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        // Mapper selon les headers
        headers.forEach((header: string, index: number) => {
          const value = values[index] || ""
          luminaire[header] = value.trim()
        })

        // Extraire l'année
        if (luminaire["Année"]) {
          const yearMatch = luminaire["Année"].toString().match(/\b(1[8-9]\d{2}|20\d{2})\b/)
          if (yearMatch) {
            luminaire.annee = Number.parseInt(yearMatch[0])
          }
        }

        // Champs de compatibilité
        luminaire.nom = luminaire["Nom luminaire"] || ""
        luminaire.designer = luminaire["Artiste / Dates"] || ""
        luminaire.filename = luminaire["Nom du fichier"] || ""
        luminaire.signe = luminaire["Signé"] || ""
        luminaire.specialite = luminaire["Spécialité"] || ""
        luminaire.collaboration = luminaire["Collaboration / Œuvre"] || ""

        documents.push(luminaire)
      } catch (error: any) {
        errors.push(`Ligne ${i + 1}: ${error.message}`)
      }
    }

    // Insertion en batch
    if (documents.length > 0) {
      try {
        await collection.insertMany(documents, { ordered: false })
        imported = documents.length
        console.log(`✅ Chunk ${chunkIndex + 1} inséré: ${imported} luminaires`)
      } catch (batchError: any) {
        console.error(`❌ Erreur insertion chunk ${chunkIndex + 1}:`, batchError)
        errors.push(`Erreur batch: ${batchError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} traité: ${imported} luminaires importés`,
      imported,
      processed: csvData.length,
      errors: errors.slice(0, 5),
      totalErrors: errors.length,
      isLastChunk: chunkIndex === totalChunks - 1,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique streaming CSV:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du streaming CSV",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
