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

    // Parser le CSV
    const records = await new Promise((resolve, reject) => {
      parse(
        csvText,
        {
          columns: true,
          skip_empty_lines: true,
          delimiter: ";",
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

    // Simuler l'import des données
    let imported = 0
    let totalErrors = 0
    for (const record of records as any[]) {
      // Simuler la création du luminaire
      console.log(`💡 Simulation de la création du luminaire: ${record["Nom luminaire"]}`)
      imported++
      // Simuler des erreurs
      if (Math.random() < 0.1) {
        totalErrors++
        console.warn(`⚠️ Erreur simulée lors de l'import de ${record["Nom luminaire"]}`)
      }
    }

    console.log(`✅ Simulation terminée: ${imported} luminaires importés, ${totalErrors} erreurs`)

    return NextResponse.json({
      success: true,
      message: "Import CSV réussi",
      imported: imported,
      processed: (records as any[]).length,
      totalErrors: totalErrors,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/upload/csv:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'import du CSV",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
