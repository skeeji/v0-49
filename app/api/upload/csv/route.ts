import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/csv - Début du traitement")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier CSV reçu: ${file.name} (${file.size} bytes)`)

    // Lire le contenu du fichier
    const text = await file.text()
    console.log(`📊 Contenu CSV: ${text.length} caractères`)

    // Nettoyer et parser le CSV ligne par ligne
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
    console.log(`📊 Nombre de lignes: ${lines.length}`)

    if (lines.length < 2) {
      return NextResponse.json({ error: "Fichier CSV vide ou invalide" }, { status: 400 })
    }

    // Parser la première ligne pour les en-têtes
    const headerLine = lines[0]
    console.log(`📋 Ligne d'en-tête brute: "${headerLine}"`)

    // Essayer différents délimiteurs
    let delimiter = ";"
    let headers = headerLine.split(delimiter)

    if (headers.length < 3) {
      delimiter = ","
      headers = headerLine.split(delimiter)
    }

    if (headers.length < 3) {
      delimiter = "\t"
      headers = headerLine.split(delimiter)
    }

    // Nettoyer les en-têtes
    headers = headers.map((h) => h.trim().replace(/^["']|["']$/g, ""))
    console.log(`📋 En-têtes détectés (délimiteur: "${delimiter}"):`, headers)

    // Parser les données
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Parser la ligne avec le délimiteur détecté
      const values = []
      let currentValue = ""
      let inQuotes = false
      let quoteChar = ""

      for (let j = 0; j < line.length; j++) {
        const char = line[j]

        if ((char === '"' || char === "'") && !inQuotes) {
          inQuotes = true
          quoteChar = char
        } else if (char === quoteChar && inQuotes) {
          if (line[j + 1] === quoteChar) {
            currentValue += char
            j++
          } else {
            inQuotes = false
            quoteChar = ""
          }
        } else if (char === delimiter && !inQuotes) {
          values.push(currentValue.trim())
          currentValue = ""
        } else {
          currentValue += char
        }
      }

      values.push(currentValue.trim())

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

    console.log("📋 Premier enregistrement:", JSON.stringify(data[0], null, 2))

    // Connexion à MongoDB
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Vider la collection avant import
    console.log("🗑️ Suppression des anciens luminaires...")
    await collection.deleteMany({})

    // Traitement par batch
    const BATCH_SIZE = 100
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      console.log(`📦 Traitement batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)}`)

      const luminairesToInsert = batch
        .map((row, index) => {
          try {
            // Extraction des champs selon le schéma exact du CSV
            const artisteDates = (row["Artiste / Dates"] || "").toString().trim()
            const specialite = (row["Spécialité"] || "").toString().trim()
            const collaboration = (row["Collaboration / Œuvre"] || "").toString().trim()
            const nomLuminaire = (row["Nom luminaire"] || "").toString().trim()
            const anneeStr = (row["Année"] || "").toString().trim()
            const signe = (row["Signé"] || "").toString().trim()
            const nomFichier = (row["Nom du fichier"] || "").toString().trim()

            // CORRECTION: Ne pas générer de nom automatique, laisser vide si pas de nom
            const finalNom = nomLuminaire || "" // Laisser vide si pas de nom

            // Parser l'année
            let annee = null
            if (anneeStr && anneeStr !== "") {
              const anneeNum = Number.parseInt(anneeStr.replace(/[^\d]/g, ""))
              if (!isNaN(anneeNum) && anneeNum > 1800 && anneeNum <= 2025) {
                annee = anneeNum
              }
            }

            // Créer l'objet luminaire avec TOUS les champs du CSV
            const luminaire = {
              // Champs principaux (peuvent être vides)
              nom: finalNom, // PEUT ÊTRE VIDE
              designer: artisteDates, // PEUT ÊTRE VIDE
              annee: annee, // PEUT ÊTRE NULL
              periode: specialite, // PEUT ÊTRE VIDE
              description: collaboration, // PEUT ÊTRE VIDE
              signe: signe, // PEUT ÊTRE VIDE
              filename: nomFichier, // Nom du fichier image

              // Champs originaux du CSV (pour compatibilité)
              "Artiste / Dates": artisteDates,
              Spécialité: specialite,
              "Collaboration / Œuvre": collaboration,
              "Nom luminaire": nomLuminaire,
              Année: anneeStr,
              Signé: signe,
              "Nom du fichier": nomFichier,

              // Champs additionnels
              materiaux: [],
              couleurs: [],
              dimensions: {},
              images: [],
              isFavorite: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            return luminaire
          } catch (error: any) {
            const errorMsg = `Ligne ${i + index + 2}: ${error.message}`
            errors.push(errorMsg)
            console.error("❌", errorMsg)
            return null
          }
        })
        .filter(Boolean)

      if (luminairesToInsert.length > 0) {
        try {
          const result = await collection.insertMany(luminairesToInsert, { ordered: false })
          imported += result.insertedCount
          console.log(`✅ Batch inséré: ${result.insertedCount} luminaires (Total: ${imported})`)
        } catch (error: any) {
          console.error(`❌ Erreur insertion batch:`, error)
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        }
      }
    }

    console.log(`✅ Import terminé: ${imported} luminaires importés sur ${data.length} lignes`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} luminaires importés sur ${data.length} lignes traitées`,
      imported,
      processed: data.length,
      errors: errors.slice(0, 20),
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'import CSV:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'import",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
