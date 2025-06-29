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

    // Parser le CSV avec différents délimiteurs
    let records: any[] = []
    try {
      // Essayer avec point-virgule d'abord
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ";",
        trim: true,
      })
      console.log(`✅ Parsing avec ';' réussi: ${records.length} lignes`)
    } catch (error) {
      try {
        // Essayer avec virgule
        records = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          delimiter: ",",
          trim: true,
        })
        console.log(`✅ Parsing avec ',' réussi: ${records.length} lignes`)
      } catch (error2) {
        console.error("❌ Erreur parsing CSV:", error2)
        return NextResponse.json({ error: "Impossible de parser le fichier CSV" }, { status: 400 })
      }
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "Aucune donnée trouvée dans le fichier CSV" }, { status: 400 })
    }

    console.log(`📊 ${records.length} lignes parsées du CSV`)
    console.log("📋 Colonnes détectées:", Object.keys(records[0]))
    console.log("📋 Premier enregistrement:", records[0])

    const client = await clientPromise
    const db = client.db(DBNAME)

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
        // Mapping des colonnes selon le schéma fourni
        const nomLuminaire = (record["Nom luminaire"] || "").toString().trim()
        const artiste = (record["Artiste / Dates"] || "").toString().trim()
        const specialite = (record["Spécialité"] || "").toString().trim()
        const collaboration = (record["Collaboration / Œuvre"] || "").toString().trim()
        const anneeStr = (record["Année"] || "").toString().trim()
        const signe = (record["Signé"] || "").toString().trim()
        const nomFichier = (record["Nom du fichier"] || "").toString().trim()

        // Validation du nom du luminaire
        if (!nomLuminaire) {
          results.errors.push(`Ligne ${i + 2}: nom du luminaire manquant`)
          continue
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
          nom: nomLuminaire,
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

        console.log(`💾 Insertion luminaire ${i + 1}/${records.length}: ${luminaire.nom}`)

        await db.collection("luminaires").insertOne(luminaire)
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
