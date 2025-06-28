import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API POST /api/upload/csv appelée")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log("📄 Fichier reçu:", file.name, `(${file.size} bytes)`)

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    if (lines.length === 0) {
      return NextResponse.json({ success: false, error: "Fichier CSV vide" }, { status: 400 })
    }

    // Analyser l'en-tête
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
    console.log("📋 En-têtes détectées:", headers)

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    const luminaires = []
    let processed = 0
    let errors = 0

    // Traiter chaque ligne
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))

        if (values.length !== headers.length) {
          console.warn(`⚠️ Ligne ${i + 1}: nombre de colonnes incorrect`)
          errors++
          continue
        }

        const luminaire: any = {}

        // Mapper chaque colonne
        headers.forEach((header, index) => {
          const value = values[index]?.trim()

          switch (header.toLowerCase()) {
            case "nom":
            case "name":
              luminaire.nom = value || ""
              break
            case "designer":
            case "artiste":
            case "artist":
              luminaire.designer = value || ""
              break
            case "annee":
            case "année":
            case "year":
              // CORRECTION: Ne pas mettre 2025 par défaut, laisser null si vide
              if (value && value !== "" && !isNaN(Number(value))) {
                const year = Number(value)
                if (year > 0 && year <= new Date().getFullYear() + 10) {
                  luminaire.annee = year
                } else {
                  luminaire.annee = null
                }
              } else {
                luminaire.annee = null
              }
              break
            case "periode":
            case "période":
            case "period":
              luminaire.periode = value || ""
              break
            case "description":
              luminaire.description = value || ""
              break
            case "materiaux":
            case "matériaux":
            case "materials":
              luminaire.materiaux = value
                ? value
                    .split(";")
                    .map((m) => m.trim())
                    .filter(Boolean)
                : []
              break
            case "couleurs":
            case "colors":
              luminaire.couleurs = value
                ? value
                    .split(";")
                    .map((c) => c.trim())
                    .filter(Boolean)
                : []
              break
            case "dimensions":
              luminaire.dimensions = value || ""
              break
            case "estimation":
            case "prix":
            case "price":
              luminaire.estimation = value || ""
              break
            case "specialite":
            case "spécialité":
            case "specialty":
              luminaire.specialite = value || ""
              break
            case "collaboration":
              luminaire.collaboration = value || ""
              break
            case "signe":
            case "signé":
            case "signed":
              luminaire.signe = value || ""
              break
            case "nom du fichier":
            case "filename":
            case "image":
              luminaire["Nom du fichier"] = value || ""
              break
            default:
              // Garder les colonnes non reconnues
              luminaire[header] = value || ""
          }
        })

        // Ajouter les métadonnées
        luminaire.createdAt = new Date()
        luminaire.updatedAt = new Date()
        luminaire.images = luminaire["Nom du fichier"] ? [luminaire["Nom du fichier"]] : []

        luminaires.push(luminaire)
        processed++

        if (processed % 100 === 0) {
          console.log(`📊 Traité ${processed} luminaires...`)
        }
      } catch (err) {
        console.error(`❌ Erreur ligne ${i + 1}:`, err)
        errors++
      }
    }

    console.log(`📊 Traitement terminé: ${processed} luminaires, ${errors} erreurs`)

    if (luminaires.length === 0) {
      return NextResponse.json({ success: false, error: "Aucun luminaire valide trouvé" }, { status: 400 })
    }

    // Insérer en base
    const result = await collection.insertMany(luminaires)
    console.log(`✅ ${result.insertedCount} luminaires insérés en base`)

    return NextResponse.json({
      success: true,
      message: `${result.insertedCount} luminaires importés avec succès`,
      imported: result.insertedCount,
      errors: errors,
      details: {
        processed,
        errors,
        headers,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/upload/csv:", error)
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
