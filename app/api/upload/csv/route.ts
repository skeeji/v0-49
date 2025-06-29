import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { parse } from "csv-parse/sync"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

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

    // Compter les lignes réelles
    const lines = fileContent.split("\n")
    console.log(`📊 Nombre total de lignes dans le fichier: ${lines.length}`)

    // Parser le CSV avec différents délimiteurs
    let records: any[] = []
    let delimiter = ";"

    try {
      // Essayer avec point-virgule d'abord
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ";",
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      })
      console.log(`✅ Parsing avec ';' réussi: ${records.length} lignes`)
      delimiter = ";"
    } catch (error) {
      try {
        // Essayer avec virgule
        records = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          delimiter: ",",
          trim: true,
          relax_quotes: true,
          relax_column_count: true,
        })
        console.log(`✅ Parsing avec ',' réussi: ${records.length} lignes`)
        delimiter = ","
      } catch (error2) {
        console.error("❌ Erreur parsing CSV:", error2)
        return NextResponse.json({ error: "Impossible de parser le fichier CSV" }, { status: 400 })
      }
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "Aucune donnée trouvée dans le fichier CSV" }, { status: 400 })
    }

    console.log(`📊 ${records.length} lignes parsées du CSV (délimiteur: '${delimiter}')`)
    console.log("📋 Colonnes détectées:", Object.keys(records[0]))
    console.log("📋 Premier enregistrement:", records[0])

    const client = await clientPromise
    const db = client.db(DBNAME)

    // Vider la collection avant import pour éviter les doublons
    console.log("🗑️ Suppression des anciens luminaires...")
    await db.collection("luminaires").deleteMany({})

    const results = {
      success: 0,
      errors: [] as string[],
      processed: 0,
    }

    // Traitement par batch pour optimiser les performances
    const BATCH_SIZE = 500 // Augmenté pour de meilleures performances
    const batches = []

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE))
    }

    console.log(`📦 Traitement par batch: ${batches.length} batches de ${BATCH_SIZE} éléments max`)

    // Traiter chaque batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const luminairesToInsert = []

      for (let i = 0; i < batch.length; i++) {
        const record = batch[i]
        const globalIndex = batchIndex * BATCH_SIZE + i
        results.processed++

        try {
          // Mapping des colonnes selon le schéma fourni
          const nomLuminaire = (record["Nom luminaire"] || "").toString().trim()
          const artiste = (record["Artiste / Dates"] || "").toString().trim()
          const specialite = (record["Spécialité"] || "").toString().trim()
          const collaboration = (record["Collaboration / Œuvre"] || "").toString().trim()
          const anneeStr = (record["Année"] || "").toString().trim()
          const signe = (record["Signé"] || "").toString().trim()
          const nomFichier = (record["Nom du fichier"] || "").toString().trim()

          // Déterminer le nom final - utiliser le nom du fichier si pas de nom luminaire
          let finalNom = nomLuminaire
          if (!finalNom && nomFichier) {
            // Extraire le nom du fichier sans extension
            finalNom = nomFichier
              .replace(/\.[^/.]+$/, "")
              .replace(/^luminaire_/, "")
              .trim()
          }
          if (!finalNom && artiste) {
            // En dernier recours, utiliser l'artiste
            finalNom = `Luminaire ${artiste.split(" ")[0]}`
          }
          if (!finalNom) {
            finalNom = `Luminaire ${globalIndex + 1}` // Nom par défaut avec index global
          }

          // Parser l'année
          let annee = null
          if (anneeStr) {
            const anneeNum = Number.parseInt(anneeStr)
            if (!isNaN(anneeNum) && anneeNum > 1000 && anneeNum <= 2025) {
              annee = anneeNum
            }
          }

          // Créer l'objet luminaire
          const luminaire = {
            nom: finalNom,
            designer: artiste,
            annee: annee,
            periode: specialite,
            description: collaboration,
            materiaux: [],
            couleurs: [],
            dimensions: {},
            images: [],
            filename: nomFichier,
            "Nom du fichier": nomFichier,
            "Artiste / Dates": artiste,
            Spécialité: specialite,
            "Collaboration / Œuvre": collaboration,
            Année: anneeStr,
            Signé: signe,
            isFavorite: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          luminairesToInsert.push(luminaire)
        } catch (error: any) {
          results.errors.push(`Ligne ${globalIndex + 2}: ${error.message}`)
          console.error(`❌ Erreur ligne ${globalIndex + 2}:`, error.message)
        }
      }

      // Insérer le batch complet
      if (luminairesToInsert.length > 0) {
        try {
          await db.collection("luminaires").insertMany(luminairesToInsert, { ordered: false })
          results.success += luminairesToInsert.length
          console.log(
            `📦 Batch ${batchIndex + 1}/${batches.length}: ${luminairesToInsert.length} luminaires insérés (Total: ${results.success})`,
          )
        } catch (error: any) {
          console.error(`❌ Erreur insertion batch ${batchIndex + 1}:`, error.message)
          results.errors.push(`Batch ${batchIndex + 1}: ${error.message}`)
        }
      }

      // Log de progression tous les 5 batches
      if ((batchIndex + 1) % 5 === 0) {
        console.log(
          `📊 Progression: ${results.success}/${records.length} luminaires insérés (${Math.round((results.success / records.length) * 100)}%)`,
        )
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
