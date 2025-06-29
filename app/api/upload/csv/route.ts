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
        // Préparer les données du luminaire
        const luminaireData = {
          _id: Date.now().toString() + "_" + i,
          nom: record["Nom luminaire"] || record.nom || "",
          designer: record["Artiste / Dates"] || record.designer || "",
          annee: record["Année"] ? Number.parseInt(record["Année"]) : new Date().getFullYear(),
          periode: record["Spécialité"] || record.periode || "",
          description: record.description || "",
          materiaux: record.materiaux ? record.materiaux.split(",").map((m: string) => m.trim()) : [],
          couleurs: record.couleurs ? record.couleurs.split(",").map((c: string) => c.trim()) : [],
          dimensions: record.dimensions || {},
          images: record.images || [],
          "Nom du fichier": record["Nom du fichier"] || record.filename || "",
          specialite: record["Spécialité"] || record.specialite || "",
          collaboration: record["Collaboration / Œuvre"] || record.collaboration || "",
          signe: record["Signé"] || record.signe || "",
          estimation: record["Estimation"] || record.estimation || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        console.log(`💾 Insertion luminaire ${i + 1}/${data.length}: ${luminaireData.nom}`)

        await db.collection("luminaires").insertOne(luminaireData)
        results.success++

        // Log de progression tous les 100 éléments
        if (results.success % 100 === 0) {
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
