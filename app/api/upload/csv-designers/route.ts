import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { parse } from "csv-parse/sync"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📤 API POST /api/upload/csv-designers appelée")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier DESIGNER.csv reçu: ${file.name}, taille: ${file.size} bytes`)

    // Lire le contenu du fichier CSV
    const content = await file.text()
    console.log(`📄 Contenu lu: ${content.length} caractères`)

    // Parser le CSV avec différents délimiteurs
    let records: any[] = []

    try {
      // Essayer avec point-virgule d'abord
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ";",
        trim: true,
      })
      console.log(`✅ Parsing avec ';' réussi: ${records.length} lignes`)
    } catch (error) {
      try {
        // Essayer avec virgule
        records = parse(content, {
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

    console.log(`📊 ${records.length} designers parsés du CSV`)
    console.log("📋 Colonnes détectées:", Object.keys(records[0]))
    console.log("📋 Premier enregistrement:", records[0])

    const client = await clientPromise
    const db = client.db(DBNAME)

    const results = {
      success: 0,
      errors: [] as string[],
      processed: 0,
    }

    // Traiter chaque ligne de designer
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      results.processed++

      try {
        // Mapping des colonnes pour DESIGNER.csv
        const nom = record["Nom"] || record["nom"] || record["name"] || ""
        const imagedesigner = record["imagedesigner"] || record["image"] || record["Image"] || ""

        if (!nom.trim()) {
          results.errors.push(`Ligne ${i + 2}: nom du designer manquant`)
          continue
        }

        // Créer un slug pour l'URL
        const slug = nom
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
          .replace(/[^a-z0-9\s-]/g, "") // Garder seulement lettres, chiffres, espaces et tirets
          .replace(/\s+/g, "-") // Remplacer espaces par tirets
          .replace(/-+/g, "-") // Éviter les tirets multiples
          .trim()

        // Créer l'objet designer
        const designer = {
          nom: nom.trim(),
          slug: slug,
          imagedesigner: imagedesigner.trim(),
          biographie: "",
          dateNaissance: "",
          dateDeces: "",
          nationalite: "",
          luminairesCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        console.log(`💾 Insertion designer ${i + 1}/${records.length}: ${designer.nom}`)

        // Utiliser upsert pour éviter les doublons
        await db.collection("designers").updateOne({ nom: designer.nom }, { $setOnInsert: designer }, { upsert: true })

        results.success++
      } catch (error: any) {
        results.errors.push(`Ligne ${i + 2}: ${error.message}`)
        console.error(`❌ Erreur ligne ${i + 2}:`, error.message)
      }
    }

    console.log(
      `✅ Import designers terminé: ${results.success} succès, ${results.errors.length} erreurs sur ${results.processed} lignes`,
    )

    return NextResponse.json({
      success: true,
      message: `Import designers terminé: ${results.success} designers importés sur ${results.processed} lignes traitées`,
      imported: results.success,
      processed: results.processed,
      errors: results.errors.slice(0, 10),
      totalErrors: results.errors.length,
      results,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'import CSV designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'import designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
