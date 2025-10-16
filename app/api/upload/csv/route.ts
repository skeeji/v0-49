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

    // Vérifier la taille du fichier
    if (file.size > 10 * 1024 * 1024) {
      // 10MB max
      return NextResponse.json(
        {
          error: "Fichier trop volumineux (max 10MB)",
          details: `Taille: ${Math.round(file.size / 1024 / 1024)}MB`,
        },
        { status: 413 },
      )
    }

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

    // Traitement par chunks de 500 lignes pour éviter les timeouts
    const CHUNK_SIZE = 500
    const totalLines = lines.length - 1 // Exclure l'en-tête

    for (let chunkStart = 1; chunkStart < lines.length; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, lines.length)
      const chunk = lines.slice(chunkStart, chunkEnd)

      console.log(
        `📦 Traitement chunk ${Math.floor(chunkStart / CHUNK_SIZE) + 1}: lignes ${chunkStart} à ${chunkEnd - 1}`,
      )

      // Préparer les documents pour insertion en batch
      const documents = []

      for (let i = 0; i < chunk.length; i++) {
        try {
          processed++
          const line = chunk[i].trim()
          if (!line) continue

          const values = parseCSVLine(line)

          // Créer l'objet luminaire
          const luminaire: any = {
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          // Mapper chaque colonne selon le schéma fourni
          headers.forEach((header, index) => {
            const value = values[index] || ""
            luminaire[header] = value.trim()
          })

          // Extraire l'année si présente
          if (luminaire["Année"]) {
            const yearMatch = luminaire["Année"].toString().match(/\b(1[8-9]\d{2}|20\d{2})\b/)
            if (yearMatch) {
              luminaire.annee = Number.parseInt(yearMatch[0])
            }
          }

          // Champs de compatibilité selon le schéma fourni
          luminaire.nom = luminaire["Nom luminaire"] || ""
          luminaire.designer = luminaire["Artiste / Dates"] || ""
          luminaire.filename = luminaire["Nom du fichier"] || ""
          luminaire.signe = luminaire["Signé"] || ""
          luminaire.specialite = luminaire["Spécialité"] || ""
          luminaire.collaboration = luminaire["Collaboration / Œuvre"] || ""
          
          // NOUVEAUX CHAMPS
          luminaire.lienSiteMarchand = luminaire["Lien site marchand"] || ""
          luminaire.etiquette = luminaire["Etiquette"] || ""
          luminaire.bibliographie = luminaire["Bibliographie"] || ""

          documents.push(luminaire)
        } catch (error: any) {
          errors.push(`Ligne ${chunkStart + i}: ${error.message}`)
          if (errors.length > 100) break
        }
      }

      // Insertion en batch
      if (documents.length > 0) {
        try {
          await collection.insertMany(documents, { ordered: false })
          imported += documents.length
          console.log(`✅ Chunk inséré: ${documents.length} luminaires (total: ${imported})`)
        } catch (batchError: any) {
          console.error(`❌ Erreur insertion batch:`, batchError)
          errors.push(`Erreur batch: ${batchError.message}`)
        }
      }

      // Pause entre les chunks pour éviter la surcharge
      if (chunkEnd < lines.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(`✅ Import terminé: ${imported}/${processed} luminaires importés`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} luminaires importés sur ${processed} lignes traitées`,
      imported,
      processed,
      errors: errors.slice(0, 20), // Limiter les erreurs affichées
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
