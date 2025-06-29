import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/csv - Début du traitement")

    const body = await request.json()
    const data = body.data

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée fournie" }, { status: 400 })
    }

    console.log(`📊 ${data.length} lignes reçues du CSV`)
    console.log("📋 Colonnes détectées:", Object.keys(data[0]))

    const client = await clientPromise
    const db = client.db(DBNAME)

    const results = {
      success: 0,
      errors: [] as string[],
      processed: 0,
    }

    // Traiter chaque ligne
    for (let i = 0; i < data.length; i++) {
      const record = data[i]
      results.processed++

      try {
        // Mapping flexible des colonnes avec valeurs par défaut
        const nomLuminaire = (record["Nom luminaire"] || record["nom"] || record["Nom"] || record["name"] || "")
          .toString()
          .trim()
        const filename = (record["Nom du fichier"] || record["filename"] || record["Filename"] || record["image"] || "")
          .toString()
          .trim()
        const designer = (
          record["Artiste / Dates"] ||
          record["designer"] ||
          record["Designer"] ||
          record["artiste"] ||
          ""
        )
          .toString()
          .trim()
        const anneeStr = (record["Année"] || record["annee"] || record["year"] || record["Year"] || "")
          .toString()
          .trim()
        const specialite = (record["Spécialité"] || record["specialite"] || record["specialty"] || "").toString().trim()

        // Déterminer le nom final
        let finalNom = nomLuminaire
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
          const parsedYear = Number.parseInt(anneeStr)
          if (!isNaN(parsedYear) && parsedYear > 1000 && parsedYear <= 2025) {
            annee = parsedYear
          }
        }

        // Créer l'objet luminaire
        const luminaire = {
          nom: finalNom,
          designer: designer,
          annee: annee,
          periode: specialite || "",
          description: (record["Description"] || record["description"] || "").toString().trim(),
          materiaux: record["Matériaux"]
            ? record["Matériaux"]
                .toString()
                .split(",")
                .map((m: string) => m.trim())
                .filter(Boolean)
            : [],
          couleurs: [],
          dimensions: {
            hauteur: record["hauteur"] ? Number.parseFloat(record["hauteur"].toString()) : undefined,
            largeur: record["largeur"] ? Number.parseFloat(record["largeur"].toString()) : undefined,
            profondeur: record["profondeur"] ? Number.parseFloat(record["profondeur"].toString()) : undefined,
          },
          images: [],
          filename: filename,
          specialite: specialite,
          collaboration: (record["Collaboration / Œuvre"] || record["collaboration"] || "").toString().trim(),
          signe: (record["Signé"] || record["signe"] || "").toString().trim(),
          estimation: (record["Estimation"] || record["estimation"] || "").toString().trim(),
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        console.log(`💾 Insertion luminaire ${i + 1}/${data.length}: ${luminaire.nom}`)

        await db.collection("luminaires").insertOne(luminaire)
        results.success++

        // Log de progression tous les 1000 éléments
        if (results.success % 1000 === 0) {
          console.log(`📊 Progression: ${results.success}/${data.length} luminaires insérés`)
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
