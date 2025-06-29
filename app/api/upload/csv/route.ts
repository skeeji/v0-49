import { type NextRequest, NextResponse } from "next/server"
import { parse } from "csv-parse"

export async function POST(request: NextRequest) {
  try {
    console.log("📝 API POST /api/upload/csv appelée")

    const formData = await request.formData()
    const file = formData.get("file") as Blob | null

    if (!file) {
      console.log("❌ Aucun fichier trouvé dans la requête")
      return NextResponse.json({ success: false, error: "Aucun fichier trouvé" }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const csvText = new TextDecoder().decode(buffer)

    console.log(`📄 Fichier reçu: ${file.name}, Taille: ${file.size} bytes, Type: ${file.type}`)

    // Parser le CSV avec gestion des colonnes vides
    const records = await new Promise((resolve, reject) => {
      parse(
        csvText,
        {
          columns: true,
          skip_empty_lines: true,
          delimiter: ";",
          relax_column_count: true, // Permet des colonnes manquantes
          trim: true, // Supprime les espaces
        },
        (err, records) => {
          if (err) {
            console.error("❌ Erreur lors du parsing du CSV:", err)
            reject(err)
          } else {
            console.log(`✅ CSV parsé avec succès: ${records.length} lignes`)
            resolve(records)
          }
        },
      )
    })

    // Traiter chaque enregistrement avec gestion des champs vides
    let imported = 0
    const errors: string[] = []

    for (const [index, record] of (records as any[]).entries()) {
      try {
        // Mapping flexible des colonnes avec valeurs par défaut
        const luminaireData = {
          nom: (record["Nom luminaire"] || record["nom"] || record["Nom"] || record["name"] || "").toString().trim(),
          filename: (record["Nom du fichier"] || record["filename"] || record["Filename"] || record["image"] || "")
            .toString()
            .trim(),
          designer: (record["Artiste / Dates"] || record["designer"] || record["Designer"] || record["artiste"] || "")
            .toString()
            .trim(),
          annee: parseYear(record["Année"] || record["annee"] || record["year"] || record["Year"] || ""),
          specialite: (record["Spécialité"] || record["specialite"] || record["specialty"] || "").toString().trim(),
          description: (record["Description"] || record["description"] || "").toString().trim(),
          materiaux: parseArray(record["Matériaux"] || record["materiaux"] || record["materials"] || ""),
          dimensions: {
            hauteur: Number.parseFloat(record["hauteur"] || record["height"] || "") || undefined,
            largeur: Number.parseFloat(record["largeur"] || record["width"] || "") || undefined,
            profondeur: Number.parseFloat(record["profondeur"] || record["depth"] || "") || undefined,
          },
          collaboration: (record["Collaboration / Œuvre"] || record["collaboration"] || "").toString().trim(),
          signe: (record["Signé"] || record["signe"] || record["signed"] || "").toString().trim(),
          estimation: (record["Estimation"] || record["estimation"] || record["price"] || "").toString().trim(),
          periode: (record["Période"] || record["periode"] || record["period"] || "").toString().trim(),
          style: (record["Style"] || record["style"] || "").toString().trim(),
          provenance: (record["Provenance"] || record["provenance"] || "").toString().trim(),
          etat: (record["État"] || record["etat"] || record["condition"] || "").toString().trim(),
        }

        // Déterminer le nom final (obligatoire)
        let finalNom = luminaireData.nom
        if (!finalNom && luminaireData.filename) {
          finalNom = luminaireData.filename.replace(/\.[^/.]+$/, "").trim()
        }

        if (!finalNom) {
          errors.push(`Ligne ${index + 2}: nom manquant`)
          continue
        }

        // Créer l'objet luminaire final
        const luminaire = {
          _id: Date.now().toString() + index,
          nom: finalNom,
          designer: luminaireData.designer,
          annee: luminaireData.annee,
          periode: luminaireData.periode,
          specialite: luminaireData.specialite,
          description: luminaireData.description,
          materiaux: luminaireData.materiaux,
          couleurs: [],
          dimensions: luminaireData.dimensions,
          images: [],
          filename: luminaireData.filename,
          "Nom du fichier": luminaireData.filename,
          collaboration: luminaireData.collaboration,
          signe: luminaireData.signe,
          estimation: luminaireData.estimation,
          style: luminaireData.style,
          provenance: luminaireData.provenance,
          etat: luminaireData.etat,
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        console.log(`💾 Simulation insertion luminaire ${index + 1}/${(records as any[]).length}: ${luminaire.nom}`)
        imported++

        // Log de progression tous les 50 éléments
        if (imported % 50 === 0) {
          console.log(`📊 Progression: ${imported}/${(records as any[]).length} luminaires traités`)
        }
      } catch (error: any) {
        errors.push(`Ligne ${index + 2}: ${error.message}`)
        console.error(`❌ Erreur ligne ${index + 2}:`, error.message)
      }
    }

    console.log(
      `✅ Import terminé: ${imported} succès, ${errors.length} erreurs sur ${(records as any[]).length} lignes`,
    )

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} luminaires importés sur ${(records as any[]).length} lignes traitées`,
      imported: imported,
      processed: (records as any[]).length,
      errors: errors.slice(0, 10), // Limiter les erreurs affichées
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

// Fonctions utilitaires
function parseYear(yearStr: string): number {
  const currentYear = new Date().getFullYear()
  if (!yearStr) return currentYear

  const parsed = Number.parseInt(yearStr.toString())
  if (isNaN(parsed) || parsed < 1000 || parsed > currentYear + 10) {
    return currentYear
  }
  return parsed
}

function parseArray(str: string): string[] {
  if (!str) return []
  return str
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
