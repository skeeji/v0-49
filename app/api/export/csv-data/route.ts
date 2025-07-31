import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/csv-data - Export CSV avec colonnes spécifiques")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Récupérer toutes les données depuis MongoDB
    const luminaires = await collection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires récupérés pour export CSV`)

    // CORRECTION FINALE : UTILISER LES MÊMES CHAMPS QUE LA PAGE LUMINAIRE ID
    const csvData = luminaires.map((luminaire, index) => {
      // Debug détaillé pour les premiers luminaires
      if (index < 5) {
        console.log(`🔍 Luminaire ${index + 1} - TOUTES LES CLÉS:`, Object.keys(luminaire))
        console.log(`🔍 Luminaire ${index + 1} - VALEURS CRITIQUES:`, {
          nom: luminaire.nom,
          "Nom luminaire": luminaire["Nom luminaire"],
          // SPÉCIALITÉ - tous les champs possibles
          periode: luminaire.periode,
          specialty: luminaire.specialty,
          specialite: luminaire.specialite,
          Spécialité: luminaire["Spécialité"],
          // COLLABORATION - tous les champs possibles
          collaboration: luminaire.collaboration,
          "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"],
        })
      }

      // Champs simples avec fallback
      const nom = luminaire.nom || luminaire["Nom luminaire"] || ""
      const designer = luminaire.designer || luminaire["Artiste / Dates"] || ""
      const annee = luminaire.annee || luminaire["Année"] || ""
      const editeur = luminaire.editeur || ""
      const description = luminaire.description || ""
      const signe = luminaire.signe || luminaire["Signé"] || ""
      const dimensions = luminaire.dimensions || ""
      const estimation = luminaire.estimation || luminaire.Prix || ""

      // SPÉCIALITÉ - LOGIQUE EXACTE DE LA PAGE LUMINAIRE ID
      let specialite = ""
      // 1. D'abord chercher dans 'periode' (champ utilisé pour les modifications)
      if (luminaire.periode && String(luminaire.periode).trim() !== "") {
        specialite = String(luminaire.periode).trim()
        if (index < 5) console.log(`✅ SPÉCIALITÉ MODIFIÉE (periode): "${specialite}"`)
      }
      // 2. Sinon chercher dans 'Spécialité' (champ original)
      else if (luminaire["Spécialité"] && String(luminaire["Spécialité"]).trim() !== "") {
        specialite = String(luminaire["Spécialité"]).trim()
        if (index < 5) console.log(`📋 SPÉCIALITÉ ORIGINALE: "${specialite}"`)
      }

      // COLLABORATION - LOGIQUE EXACTE DE LA PAGE LUMINAIRE ID
      let collaboration = ""
      // 1. D'abord chercher dans 'collaboration' (champ utilisé pour les modifications)
      if (luminaire.collaboration && String(luminaire.collaboration).trim() !== "") {
        collaboration = String(luminaire.collaboration).trim()
        if (index < 5) console.log(`✅ COLLABORATION MODIFIÉE: "${collaboration}"`)
      }
      // 2. Sinon chercher dans 'Collaboration / Œuvre' (champ original)
      else if (luminaire["Collaboration / Œuvre"] && String(luminaire["Collaboration / Œuvre"]).trim() !== "") {
        collaboration = String(luminaire["Collaboration / Œuvre"]).trim()
        if (index < 5) console.log(`📋 COLLABORATION ORIGINALE: "${collaboration}"`)
      }

      // MATÉRIAUX
      let materiaux = ""
      if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
        materiaux = luminaire.materiaux.join(", ")
      } else if (luminaire.Matériaux && String(luminaire.Matériaux).trim() !== "") {
        materiaux = String(luminaire.Matériaux).trim()
      }

      // Images
      let images = ""
      if (Array.isArray(luminaire.images)) {
        images = luminaire.images.join(", ")
      } else if (luminaire.filename) {
        images = luminaire.filename
      }

      const result = {
        ID: luminaire._id.toString(),
        "Nom luminaire": nom,
        "Artiste / Dates": designer,
        Année: annee,
        Editeur: editeur,
        Spécialité: specialite,
        "Collaboration / Œuvre": collaboration,
        Description: description,
        Signé: signe,
        Dimensions: dimensions,
        Matériaux: materiaux,
        Estimation: estimation,
        Prix: estimation,
        "Image luminaire": images,
        "Image designer": luminaire.designerImageFilename || "",
      }

      // Debug final pour les premiers luminaires
      if (index < 5) {
        console.log(`📋 RÉSULTAT FINAL CSV Ligne ${index + 1}:`, {
          nom: result["Nom luminaire"],
          specialite: result["Spécialité"],
          collaboration: result["Collaboration / Œuvre"],
        })
      }

      return result
    })

    if (csvData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée à exporter" }, { status: 404 })
    }

    // Vérification finale
    console.log("🔍 VÉRIFICATION FINALE:")
    const specialiteCount = csvData.filter((row) => row["Spécialité"] && row["Spécialité"].trim() !== "").length
    const collaborationCount = csvData.filter(
      (row) => row["Collaboration / Œuvre"] && row["Collaboration / Œuvre"].trim() !== "",
    ).length

    console.log(`📊 Spécialité remplie: ${specialiteCount}/${csvData.length} luminaires`)
    console.log(`📊 Collaboration / Œuvre remplie: ${collaborationCount}/${csvData.length} luminaires`)

    // Créer les en-têtes CSV
    const headers = [
      "ID",
      "Nom luminaire",
      "Artiste / Dates",
      "Année",
      "Editeur",
      "Spécialité",
      "Collaboration / Œuvre",
      "Description",
      "Signé",
      "Dimensions",
      "Matériaux",
      "Estimation",
      "Prix",
      "Image luminaire",
      "Image designer",
    ]

    // Créer le contenu CSV
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] || ""
            const cleanValue = String(value).replace(/"/g, '""')
            return `"${cleanValue}"`
          })
          .join(","),
      ),
    ].join("\n")

    console.log(`✅ Export terminé: ${csvData.length} luminaires exportés`)

    // Retourner le CSV avec BOM UTF-8
    const csvWithBOM = "\uFEFF" + csvContent

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="luminaires-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur export CSV:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export CSV",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
