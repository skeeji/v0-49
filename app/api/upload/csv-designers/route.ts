import { type NextRequest, NextResponse } from "next/server"
import { parse } from "csv-parse"

export async function POST(request: NextRequest) {
  try {
    console.log("📝 API POST /api/upload/csv-designers appelée")

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
        // Nettoyer et valider les données avec valeurs par défaut
        const designerData = {
          nom: (record.Nom || record.nom || record.Name || "").toString().trim(),
          imagedesigner: (record.imagedesigner || record.image || record.Image || "").toString().trim(),
          description: (record.Description || record.description || "").toString().trim(),
          biographie: (record.Biographie || record.biographie || record.Bio || "").toString().trim(),
          dateNaissance: (record.DateNaissance || record.dateNaissance || record.Birth || "").toString().trim(),
          dateDeces: (record.DateDeces || record.dateDeces || record.Death || "").toString().trim(),
          nationalite: (record.Nationalite || record.nationalite || record.Nationality || "").toString().trim(),
          specialite: (record.Specialite || record.specialite || record.Specialty || "").toString().trim(),
        }

        // Vérifier qu'au moins le nom est présent
        if (!designerData.nom) {
          errors.push(`Ligne ${index + 2}: Nom manquant`)
          continue
        }

        // Simuler l'insertion en base (remplacer par vraie logique MongoDB)
        console.log(`👨‍🎨 Création du designer: ${designerData.nom}`)
        imported++
      } catch (error: any) {
        errors.push(`Ligne ${index + 2}: ${error.message}`)
        console.error(`❌ Erreur ligne ${index + 2}:`, error)
      }
    }

    console.log(`✅ Import terminé: ${imported} designers importés, ${errors.length} erreurs`)

    return NextResponse.json({
      success: true,
      message: `Import CSV des designers réussi: ${imported} designers importés`,
      imported: imported,
      processed: (records as any[]).length,
      errors: errors.slice(0, 10), // Limiter les erreurs affichées
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/upload/csv-designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'import du CSV des designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
