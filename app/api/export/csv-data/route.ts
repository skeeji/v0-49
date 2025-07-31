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

    // LOGIQUE CORRIGÉE : PRIORITÉ AUX CHAMPS MODIFIÉS
    const csvData = luminaires.map((luminaire, index) => {
      // Debug pour les premiers luminaires seulement
      if (index < 3) {
        console.log(`🔍 Luminaire ${index + 1} - Comparaison valeurs:`, {
          nom: luminaire.nom || luminaire["Nom luminaire"],
          // Valeurs originales du CSV
          "Spécialité (original)": luminaire["Spécialité"],
          "Collaboration / Œuvre (original)": luminaire["Collaboration / Œuvre"],
          // Valeurs modifiées sur le site
          "periode (modifié)": luminaire.periode,
          "collaboration (modifié)": luminaire.collaboration,
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

      // SPÉCIALITÉ : PRIORITÉ AU CHAMP MODIFIÉ 'periode'
      let specialite = ""
      if (luminaire.periode && String(luminaire.periode).trim() !== "") {
        // Valeur modifiée sur le site
        specialite = String(luminaire.periode).trim()
        if (index < 3) console.log(`✅ Spécialité modifiée trouvée: "${specialite}"`)
      } else if (luminaire["Spécialité"] && String(luminaire["Spécialité"]).trim() !== "") {
        // Valeur originale du CSV
        specialite = String(luminaire["Spécialité"]).trim()
        if (index < 3) console.log(`📋 Spécialité originale utilisée: "${specialite}"`)
      }

      // COLLABORATION / ŒUVRE : PRIORITÉ AU CHAMP MODIFIÉ 'collaboration'
      let collaboration = ""
      if (luminaire.collaboration && String(luminaire.collaboration).trim() !== "") {
        // Valeur modifiée sur le site
        collaboration = String(luminaire.collaboration).trim()
        if (index < 3) console.log(`✅ Collaboration modifiée trouvée: "${collaboration}"`)
      } else if (luminaire["Collaboration / Œuvre"] && String(luminaire["Collaboration / Œuvre"]).trim() !== "") {
        // Valeur originale du CSV
        collaboration = String(luminaire["Collaboration / Œuvre"]).trim()
        if (index < 3) console.log(`📋 Collaboration originale utilisée: "${collaboration}"`)
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

      // Debug pour les premiers luminaires
      if (index < 3) {
        console.log(`📋 Luminaire ${index + 1} - Résultat final CSV:`, {
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

    // Vérification finale des colonnes critiques
    console.log("🔍 Vérification finale des colonnes critiques:")

    const specialiteCount = csvData.filter((row) => row["Spécialité"] && row["Spécialité"].trim() !== "").length
    const collaborationCount = csvData.filter(
      (row) => row["Collaboration / Œuvre"] && row["Collaboration / Œuvre"].trim() !== "",
    ).length
    const materiauxCount = csvData.filter((row) => row["Matériaux"] && row["Matériaux"].trim() !== "").length

    console.log(`📊 Spécialité remplie: ${specialiteCount}/${csvData.length} luminaires`)
    console.log(`📊 Collaboration / Œuvre remplie: ${collaborationCount}/${csvData.length} luminaires`)
    console.log(`📊 Matériaux remplis: ${materiauxCount}/${csvData.length} luminaires`)

    // Exemples de données exportées
    console.log("📋 Exemples de données dans le CSV final:")
    csvData.slice(0, 3).forEach((row, idx) => {
      console.log(`CSV Ligne ${idx + 1}:`, {
        nom: row["Nom luminaire"],
        specialite: row["Spécialité"],
        collaboration: row["Collaboration / Œuvre"],
        materiaux: row["Matériaux"],
      })
    })

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
