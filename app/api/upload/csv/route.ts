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
        const luminaireData = {
          nom: (record.nom || record.Nom || record.name || record.Name || record.title || record.Title || "")
            .toString()
            .trim(),
          designer: (
            record.designer ||
            record.Designer ||
            record.auteur ||
            record.Auteur ||
            record.artist ||
            record.Artist ||
            ""
          )
            .toString()
            .trim(),
          annee: record.annee || record.Annee || record.year || record.Year || record.date || record.Date || "",
          periode: (
            record.periode ||
            record.Periode ||
            record.period ||
            record.Period ||
            record.epoque ||
            record.Epoque ||
            ""
          )
            .toString()
            .trim(),
          description: (record.description || record.Description || record.desc || record.Desc || "").toString().trim(),
          materiaux:
            record.materiaux ||
            record.Materiaux ||
            record.materials ||
            record.Materials ||
            record.matiere ||
            record.Matiere ||
            "",
          couleurs:
            record.couleurs ||
            record.Couleurs ||
            record.colors ||
            record.Colors ||
            record.couleur ||
            record.Couleur ||
            "",
          dimensions:
            record.dimensions ||
            record.Dimensions ||
            record.size ||
            record.Size ||
            record.taille ||
            record.Taille ||
            "",
          images: record.images || record.Images || record.image || record.Image || [],
          filename: (record.filename || record.Filename || record["Nom du fichier"] || record["nom du fichier"] || "")
            .toString()
            .trim(),
          specialite: (record.specialite || record.Specialite || record.specialty || record.Specialty || "")
            .toString()
            .trim(),
          collaboration: (record.collaboration || record.Collaboration || "").toString().trim(),
          signe: (record.signe || record.Signe || record.signature || record.Signature || "").toString().trim(),
          estimation: (
            record.estimation ||
            record.Estimation ||
            record.price ||
            record.Price ||
            record.prix ||
            record.Prix ||
            ""
          )
            .toString()
            .trim(),
        }

        // Traitement de l'année
        let anneeNum = null
        if (luminaireData.annee) {
          const anneeStr = luminaireData.annee.toString().trim()
          const anneeMatch = anneeStr.match(/\d{4}/)
          if (anneeMatch) {
            anneeNum = Number.parseInt(anneeMatch[0])
            if (anneeNum < 1000 || anneeNum > new Date().getFullYear() + 10) {
              anneeNum = null
            }
          }
        }

        // Traitement des matériaux
        let materiauxArray = []
        if (luminaireData.materiaux) {
          if (Array.isArray(luminaireData.materiaux)) {
            materiauxArray = luminaireData.materiaux
          } else {
            materiauxArray = luminaireData.materiaux
              .toString()
              .split(/[,;|]/)
              .map((m: string) => m.trim())
              .filter((m: string) => m)
          }
        }

        // Traitement des couleurs
        let couleursArray = []
        if (luminaireData.couleurs) {
          if (Array.isArray(luminaireData.couleurs)) {
            couleursArray = luminaireData.couleurs
          } else {
            couleursArray = luminaireData.couleurs
              .toString()
              .split(/[,;|]/)
              .map((c: string) => c.trim())
              .filter((c: string) => c)
          }
        }

        // Traitement des dimensions
        let dimensionsObj = {}
        if (luminaireData.dimensions) {
          if (typeof luminaireData.dimensions === "object") {
            dimensionsObj = luminaireData.dimensions
          } else {
            const dimStr = luminaireData.dimensions.toString()
            // Essayer de parser les dimensions (ex: "H: 30cm, L: 20cm")
            const matches = dimStr.match(/(\d+(?:\.\d+)?)\s*(?:cm|mm|m)?/g)
            if (matches && matches.length >= 2) {
              dimensionsObj = {
                hauteur: matches[0],
                largeur: matches[1],
                profondeur: matches[2] || null,
              }
            } else {
              dimensionsObj = { description: dimStr }
            }
          }
        }

        // Créer l'objet luminaire
        const luminaire = {
          nom: luminaireData.nom,
          designer: luminaireData.designer,
          annee: anneeNum,
          periode: luminaireData.periode,
          description: luminaireData.description,
          materiaux: materiauxArray,
          couleurs: couleursArray,
          dimensions: dimensionsObj,
          images: Array.isArray(luminaireData.images) ? luminaireData.images : [],
          filename: luminaireData.filename,
          "Nom du fichier": luminaireData.filename, // Compatibilité
          specialite: luminaireData.specialite,
          collaboration: luminaireData.collaboration,
          signe: luminaireData.signe,
          estimation: luminaireData.estimation,
          createdAt: new Date(),
          updatedAt: new Date(),
          index: i,
        }

        console.log(`💾 Insertion luminaire ${i + 1}/${data.length}: ${luminaire.nom}`)

        await db.collection("luminaires").insertOne(luminaire)
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
