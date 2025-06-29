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

    // Compter les lignes réelles
    const lines = text.split("\n").filter((line) => line.trim().length > 0)
    console.log(`📊 Nombre de lignes dans le fichier: ${lines.length}`)

    // Parser le CSV manuellement pour gérer les gros fichiers
    const headers = lines[0].split(";").map((h) => h.trim().replace(/"/g, ""))
    console.log(`📋 En-têtes détectés:`, headers)

    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(";").map((v) => v.trim().replace(/"/g, ""))
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

    // Afficher un échantillon des données
    console.log("📋 Premier enregistrement:", data[0])

    // Connexion à MongoDB
    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Vider la collection avant import
    console.log("🗑️ Suppression des anciens luminaires...")
    await collection.deleteMany({})

    // Traitement par batch
    const BATCH_SIZE = 500
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      console.log(`📦 Traitement batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)}`)

      const luminairesToInsert = batch
        .map((row, index) => {
          try {
            // Mapping exact selon votre schéma CSV
            const artiste = (row["Artiste / Dates"] || "").toString().trim()
            const specialite = (row["Spécialité"] || "").toString().trim()
            const collaboration = (row["Collaboration / Œuvre"] || "").toString().trim()
            const nomLuminaire = (row["Nom luminaire"] || "").toString().trim()
            const anneeStr = (row["Année"] || "").toString().trim()
            const signe = (row["Signé"] || "").toString().trim()
            const nomFichier = (row["Nom du fichier"] || "").toString().trim()

            // Déterminer le nom final
            let finalNom = nomLuminaire
            if (!finalNom && nomFichier) {
              finalNom = nomFichier
                .replace(/\.[^/.]+$/, "")
                .replace(/^luminaire_/, "")
                .trim()
            }
            if (!finalNom) {
              finalNom = `Luminaire ${i + index + 1}`
            }

            // Parser l'année - CORRECTION: laisser null si pas d'année
            let annee = null
            if (anneeStr && anneeStr !== "") {
              const anneeNum = Number.parseInt(anneeStr)
              if (!isNaN(anneeNum) && anneeNum > 1000 && anneeNum <= 2025) {
                annee = anneeNum
              }
            }

            return {
              nom: finalNom,
              designer: artiste,
              annee: annee, // Peut être null
              periode: specialite,
              description: collaboration,
              materiaux: [],
              couleurs: [],
              dimensions: {},
              images: [],
              filename: nomFichier,
              // Garder les champs originaux pour compatibilité
              "Artiste / Dates": artiste,
              Spécialité: specialite,
              "Collaboration / Œuvre": collaboration,
              "Nom luminaire": nomLuminaire,
              Année: anneeStr,
              Signé: signe,
              "Nom du fichier": nomFichier,
              isFavorite: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          } catch (error: any) {
            errors.push(`Ligne ${i + index + 2}: ${error.message}`)
            return null
          }
        })
        .filter(Boolean)

      if (luminairesToInsert.length > 0) {
        try {
          await collection.insertMany(luminairesToInsert, { ordered: false })
          imported += luminairesToInsert.length
          console.log(`✅ Batch inséré: ${luminairesToInsert.length} luminaires (Total: ${imported})`)
        } catch (error: any) {
          console.error(`❌ Erreur insertion batch:`, error)
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        }
      }

      // Log de progression
      if ((Math.floor(i / BATCH_SIZE) + 1) % 5 === 0) {
        console.log(
          `📊 Progression: ${imported}/${data.length} luminaires (${Math.round((imported / data.length) * 100)}%)`,
        )
      }
    }

    console.log(`✅ Import terminé: ${imported} luminaires importés sur ${data.length} lignes`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${imported} luminaires importés sur ${data.length} lignes traitées`,
      imported,
      processed: data.length,
      errors: errors.slice(0, 10),
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
