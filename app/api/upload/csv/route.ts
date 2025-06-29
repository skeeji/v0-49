import { type NextRequest, NextResponse } from "next/server"

// Simulation d'une base de données
const luminaires: any[] = []

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/csv - Début du traitement")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier CSV reçu: ${file.name}, taille: ${file.size} bytes`)

    // Lire le contenu du fichier
    const fileContent = await file.text()
    console.log(`📄 Contenu lu: ${fileContent.length} caractères`)

    // Parser le CSV (simulation simple)
    const lines = fileContent.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(";").map((h) => h.replace(/"/g, "").trim())

    console.log("📋 Colonnes détectées:", headers)

    const records = lines.slice(1).map((line) => {
      const values = line.split(";").map((v) => v.replace(/"/g, "").trim())
      const record: any = {}
      headers.forEach((header, index) => {
        record[header] = values[index] || ""
      })
      return record
    })

    console.log(`📊 ${records.length} lignes parsées du CSV`)

    const results = {
      success: 0,
      errors: [] as string[],
      processed: 0,
    }

    // Traiter chaque ligne
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      results.processed++

      try {
        // Mapping des colonnes (flexible)
        const nomLuminaire = record["Nom luminaire"] || record["nom"] || record["Nom"] || record["name"] || ""
        const filename = record["Nom du fichier"] || record["filename"] || record["Filename"] || record["image"] || ""
        const designer =
          record["Artiste / Dates"] || record["designer"] || record["Designer"] || record["artiste"] || ""
        const anneeStr = record["Année"] || record["annee"] || record["year"] || record["Year"] || ""
        const specialite = record["Spécialité"] || record["specialite"] || record["specialty"] || ""

        // Déterminer le nom final
        let finalNom = nomLuminaire.trim()
        if (!finalNom && filename) {
          finalNom = filename.replace(/\.[^/.]+$/, "").trim()
        }

        if (!finalNom) {
          results.errors.push(`Ligne ${i + 2}: nom manquant`)
          continue
        }

        // Parser l'année
        let annee = new Date().getFullYear()
        if (anneeStr) {
          const parsedYear = Number.parseInt(anneeStr.toString())
          if (!isNaN(parsedYear) && parsedYear > 1000 && parsedYear <= 2025) {
            annee = parsedYear
          }
        }

        // Créer l'objet luminaire
        const luminaire = {
          _id: Date.now().toString() + i,
          nom: finalNom,
          designer: designer.trim(),
          annee: annee,
          periode: specialite.trim() || "",
          description: (record["Description"] || record["description"] || "").trim(),
          materiaux: record["Matériaux"]
            ? record["Matériaux"]
                .split(",")
                .map((m: string) => m.trim())
                .filter(Boolean)
            : [],
          couleurs: [],
          dimensions: {
            hauteur: record["hauteur"] ? Number.parseFloat(record["hauteur"]) : undefined,
            largeur: record["largeur"] ? Number.parseFloat(record["largeur"]) : undefined,
            profondeur: record["profondeur"] ? Number.parseFloat(record["profondeur"]) : undefined,
          },
          images: [],
          filename: filename.trim(),
          "Nom du fichier": filename.trim(),
          specialite: specialite.trim(),
          collaboration: (record["Collaboration / Œuvre"] || record["collaboration"] || "").trim(),
          signe: (record["Signé"] || record["signe"] || "").trim(),
          estimation: (record["Estimation"] || record["estimation"] || "").trim(),
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        console.log(`💾 Insertion luminaire ${i + 1}/${records.length}: ${luminaire.nom}`)

        luminaires.push(luminaire)
        results.success++

        // Log de progression tous les 100 éléments
        if (results.success % 100 === 0) {
          console.log(`📊 Progression: ${results.success}/${records.length} luminaires insérés`)
        }
      } catch (error: any) {
        results.errors.push(`Ligne ${i + 2}: ${error.message}`)
        console.error(`❌ Erreur ligne ${i + 2}:`, error.message)
      }
    }

    console.log(
      `✅ Import terminé: ${results.success} succès, ${results.errors.length} erreurs sur ${results.processed} lignes`,
    )

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${results.success} luminaires importés sur ${results.processed} lignes traitées`,
      imported: results.success,
      processed: results.processed,
      errors: results.errors.slice(0, 10), // Limiter les erreurs affichées
      totalErrors: results.errors.length,
      results,
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
