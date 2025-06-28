import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { parse } from "csv-parse/sync"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    console.log(`📁 Fichier CSV reçu: ${file.name}, taille: ${file.size} bytes`)

    // Lire et parser le CSV
    const fileContent = await file.text()
    console.log("📄 Contenu CSV lu, parsing en cours...")

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ";",
    })

    console.log(`📊 ${records.length} lignes parsées du CSV`)

    const client = await clientPromise
    const db = client.db(DBNAME)

    const results = {
      success: 0,
      errors: [] as string[],
    }

    // Traiter chaque ligne
    for (let i = 0; i < records.length; i++) {
      const record = records[i]

      try {
        // Extraire le nom du luminaire
        const nomLuminaire = record["Nom luminaire"] || record["nom"] || ""
        const filename = record["Nom du fichier"] || record["filename"] || ""
        const finalNom = nomLuminaire || filename.replace(/\.[^/.]+$/, "")

        if (!finalNom) {
          results.errors.push(`Ligne ${i + 2}: nom manquant`)
          continue
        }

        const luminaire = {
          nom: finalNom,
          designer: record["Artiste / Dates"] || record["designer"] || "",
          annee: Number.parseInt(record["Année"] || record["annee"]) || new Date().getFullYear(),
          periode: record["Spécialité"] || record["periode"] || "",
          description: record["Description"] || record["description"] || "",
          materiaux: record["Matériaux"] ? record["Matériaux"].split(",").map((m: string) => m.trim()) : [],
          couleurs: [],
          dimensions: {
            hauteur: record["hauteur"] ? Number.parseFloat(record["hauteur"]) : undefined,
            largeur: record["largeur"] ? Number.parseFloat(record["largeur"]) : undefined,
            profondeur: record["profondeur"] ? Number.parseFloat(record["profondeur"]) : undefined,
          },
          images: [],
          filename: filename,
          specialite: record["Spécialité"] || record["specialite"] || "",
          collaboration: record["Collaboration / Œuvre"] || record["collaboration"] || "",
          signe: record["Signé"] || record["signe"] || "",
          estimation: record["Estimation"] || record["estimation"] || "",
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        console.log(`💾 Insertion luminaire ${i + 1}: ${luminaire.nom}`)

        await db.collection("luminaires").insertOne(luminaire)
        results.success++
      } catch (error: any) {
        results.errors.push(`Ligne ${i + 2}: ${error.message}`)
        console.error(`❌ Erreur ligne ${i + 2}:`, error)
      }
    }

    console.log(`✅ Import terminé: ${results.success} succès, ${results.errors.length} erreurs`)

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${results.success} luminaires importés`,
      imported: results.success,
      errors: results.errors,
      results,
    })
  } catch (error: any) {
    console.error("❌ Erreur lors de l'import CSV:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
