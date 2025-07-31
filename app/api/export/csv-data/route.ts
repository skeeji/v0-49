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

    // LOGIQUE CORRIGÉE POUR L'EXPORT CSV
    const csvData = luminaires.map((luminaire, index) => {
      // Debug: afficher toutes les clés disponibles pour ce luminaire
      console.log(`🔍 Luminaire ${index + 1} - Toutes les clés:`, Object.keys(luminaire))
      console.log(`🔍 Luminaire ${index + 1} - Valeurs spécifiques:`, {
        // Champs originaux CSV
        Spécialité: luminaire["Spécialité"],
        "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"],
        // Champs potentiellement modifiés
        periode: luminaire.periode,
        collaboration: luminaire.collaboration,
        specialite: luminaire.specialite,
        // Autres variantes
        specialty: luminaire.specialty,
      })

      // Champs simples avec fallback
      const nom = luminaire.nom || luminaire["Nom luminaire"] || ""
      const designer = luminaire.designer || luminaire["Artiste / Dates"] || ""
      const annee = luminaire.annee || luminaire["Année"] || ""
      const editeur = luminaire.editeur || ""
      const description = luminaire.description || ""
      const signe = luminaire.signe || luminaire["Signé"] || ""
      const dimensions = luminaire.dimensions || ""
      const estimation = luminaire.estimation || luminaire.Prix || ""

      // LOGIQUE CORRIGÉE POUR SPÉCIALITÉ
      // D'après le code de la page luminaire, specialty est mappé vers "periode"
      let specialite = ""
      if (luminaire.periode && String(luminaire.periode).trim() !== "") {
        specialite = String(luminaire.periode).trim()
        console.log(`✅ Spécialité trouvée dans 'periode': "${specialite}"`)
      } else if (luminaire.specialty && String(luminaire.specialty).trim() !== "") {
        specialite = String(luminaire.specialty).trim()
        console.log(`✅ Spécialité trouvée dans 'specialty': "${specialite}"`)
      } else if (luminaire.specialite && String(luminaire.specialite).trim() !== "") {
        specialite = String(luminaire.specialite).trim()
        console.log(`✅ Spécialité trouvée dans 'specialite': "${specialite}"`)
      } else if (luminaire["Spécialité"] && String(luminaire["Spécialité"]).trim() !== "") {
        specialite = String(luminaire["Spécialité"]).trim()
        console.log(`✅ Spécialité trouvée dans 'Spécialité': "${specialite}"`)
      }

      // LOGIQUE CORRIGÉE POUR COLLABORATION / ŒUVRE
      // D'après le code, collaboration reste "collaboration"
      let collaboration = ""
      if (luminaire.collaboration && String(luminaire.collaboration).trim() !== "") {
        collaboration = String(luminaire.collaboration).trim()
        console.log(`✅ Collaboration trouvée dans 'collaboration': "${collaboration}"`)
      } else if (luminaire["Collaboration / Œuvre"] && String(luminaire["Collaboration / Œuvre"]).trim() !== "") {
        collaboration = String(luminaire["Collaboration / Œuvre"]).trim()
        console.log(`✅ Collaboration trouvée dans 'Collaboration / Œuvre': "${collaboration}"`)
      }

      // LOGIQUE POUR MATÉRIAUX
      let materiaux = ""
      if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
        materiaux = luminaire.materiaux.join(", ")
      } else if (luminaire.materials && String(luminaire.materials).trim() !== "") {
        materiaux = String(luminaire.materials).trim()
      } else if (luminaire.Matériaux && String(luminaire.Matériaux).trim() !== "") {
        materiaux = String(luminaire.Matériaux).trim()
      }

      // Transformation des images en chaîne
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

      console.log(`📋 Luminaire ${index + 1} - Résultat final:`, {
        nom: result["Nom luminaire"],
        specialite: result["Spécialité"],
        collaboration: result["Collaboration / Œuvre"],
      })

      return result
    })

    if (csvData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée à exporter" }, { status: 404 })
    }

    // Créer les en-têtes CSV dans l'ordre exact demandé
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

    console.log(`✅ Export CSV généré avec ${csvData.length} luminaires et ${headers.length} colonnes`)

    // Statistiques finales
    const specialiteCount = csvData.filter((row) => row["Spécialité"] && row["Spécialité"].trim() !== "").length
    const collaborationCount = csvData.filter(
      (row) => row["Collaboration / Œuvre"] && row["Collaboration / Œuvre"].trim() !== "",
    ).length

    console.log(`📊 Statistiques finales:`)
    console.log(`   - Spécialité remplie: ${specialiteCount}/${csvData.length}`)
    console.log(`   - Collaboration remplie: ${collaborationCount}/${csvData.length}`)

    // Exemples des premières valeurs
    console.log(`📋 Premiers exemples:`)
    csvData.slice(0, 3).forEach((row, idx) => {
      console.log(
        `   ${idx + 1}. "${row["Nom luminaire"]}" - Spécialité: "${row["Spécialité"]}" - Collaboration: "${row["Collaboration / Œuvre"]}"`,
      )
    })

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
