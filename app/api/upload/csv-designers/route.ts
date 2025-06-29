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

    // Parser le CSV
    const records = await new Promise((resolve, reject) => {
      parse(
        csvText,
        {
          columns: true,
          skip_empty_lines: true,
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
    for (const record of records as any[]) {
      // Simuler la création du designer
      console.log(`👨‍🎨 Simulation de la création du designer: ${record.Nom}`)
      imported++
    }

    console.log(`✅ Simulation terminée: ${imported} designers importés`)

    return NextResponse.json({
      success: true,
      message: "Import CSV des designers réussi",
      imported: imported,
      processed: (records as any[]).length,
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
