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
          specialite: specialite.trim(),
          collaboration: (record["Collaboration / Œuvre"] || record["collaboration"] || "").trim(),
          signe: (record["Signé"] || record["signe"] || "").trim(),
          estimation: (record["Estimation"] || record["estimation"] || "").trim(),
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        console.log(`💾 Insertion luminaire ${i + 1}/${records.length}: ${luminaire.nom}`)

        await db.collection("luminaires").insertOne(luminaire)
        results.success++

        // Log de progression tous les 1000 éléments
        if (results.success % 1000 === 0) {
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
