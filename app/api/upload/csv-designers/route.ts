import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("📥 API /api/upload/csv-designers - Début du traitement")

    const body = await request.json()
    const data = body.data

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée fournie" }, { status: 400 })
    }

    console.log(`📊 ${data.length} lignes reçues du CSV designers`)
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
        // Mapping flexible des colonnes
        const nom = (record.Nom || record.nom || record.Name || record.name || "").toString().trim()
        const imagedesigner = (record.imagedesigner || record.image || record.Image || "").toString().trim()
        const description = (record.Description || record.description || "").toString().trim()
        const biographie = (record.Biographie || record.biographie || "").toString().trim()
        const dateNaissance = (record.DateNaissance || record.dateNaissance || "").toString().trim()
        const dateDeces = (record.DateDeces || record.dateDeces || "").toString().trim()
        const nationalite = (record.Nationalite || record.nationalite || "").toString().trim()
        const specialite = (record.Specialite || record.specialite || "").toString().trim()

        if (!nom) {
          results.errors.push(`Ligne ${i + 2}: nom manquant`)
          continue
        }

        // Créer le slug
        const slug = nom
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")

        // Préparer les données du designer
        const designer = {
          Nom: nom,
          imagedesigner: imagedesigner,
          description: description,
          biographie: biographie,
          dateNaissance: dateNaissance,
          dateDeces: dateDeces,
          nationalite: nationalite,
          specialite: specialite,
          slug: slug,
          createdAt: new Date(),
          updatedAt: new Date(),
          index: i,
        }

        console.log(`💾 Insertion designer ${i + 1}/${data.length}: ${designer.Nom}`)

        await db.collection("designers").insertOne(designer)
        results.success++

        // Log de progression tous les 100 éléments
        if (results.success % 100 === 0) {
          console.log(`📊 Progression: ${results.success}/${data.length} designers insérés`)
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
      message: `Import terminé: ${results.success} designers importés sur ${results.processed} lignes traitées`,
      imported: results.success,
      processed: results.processed,
      errors: results.errors.slice(0, 10), // Limiter les erreurs affichées
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur critique lors de l'import CSV designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de l'import des designers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
