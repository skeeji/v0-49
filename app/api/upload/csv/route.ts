import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/csv - Début de l'import CSV")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier CSV reçu: ${file.name} (${file.size} bytes)`)

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    if (lines.length === 0) {
      return NextResponse.json({ error: "Fichier CSV vide" }, { status: 400 })
    }

    console.log(`📊 ${lines.length} lignes détectées dans le CSV`)

    // Parser l'en-tête
    const headers = lines[0].split(";").map((h) => h.trim().replace(/"/g, ""))
    console.log("📋 En-têtes détectés:", headers)

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Vider la collection existante
    await db.collection("luminaires").deleteMany({})
    console.log("🗑️ Collection luminaires vidée")

    const luminaires = []
    const errors = []

    // Parser chaque ligne
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(";").map((v) => v.trim().replace(/"/g, ""))

        if (values.length !== headers.length) {
          errors.push(`Ligne ${i + 1}: Nombre de colonnes incorrect (${values.length} vs ${headers.length})`)
          continue
        }

        const luminaire: any = {}

        // Mapper chaque valeur avec son en-tête
        headers.forEach((header, index) => {
          const value = values[index]
          luminaire[header] = value === "" ? null : value
        })

        // Traitement spécial pour l'année
        if (luminaire["Année"]) {
          const year = Number.parseInt(luminaire["Année"])
          if (!isNaN(year) && year > 1000 && year < 2100) {
            luminaire.annee = year
          }
        }

        luminaires.push(luminaire)
      } catch (error: any) {
        errors.push(`Ligne ${i + 1}: ${error.message}`)
      }
    }

    console.log(`✅ ${luminaires.length} luminaires parsés, ${errors.length} erreurs`)

    // Insérer en base
    let imported = 0
    if (luminaires.length > 0) {
      const result = await db.collection("luminaires").insertMany(luminaires)
      imported = result.insertedCount
      console.log(`💾 ${imported} luminaires insérés en base`)
    }

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} luminaires importés sur ${lines.length - 1} lignes traitées`,
      imported,
      processed: lines.length - 1,
      errors: errors.slice(0, 10),
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique import CSV:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'import CSV",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
