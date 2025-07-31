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
      // Debug pour les premiers luminaires seulement
      if (index < 5) {
        console.log(`🔍 Luminaire ${index + 1} - Debug détaillé:`, {
          nom: luminaire.nom || luminaire["Nom luminaire"],
          // Tous les champs possibles pour spécialité
          periode: luminaire.periode,
          specialty: luminaire.specialty,
          specialite: luminaire.specialite,
          Spécialité: luminaire["Spécialité"],
          // Tous les champs possibles pour collaboration
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

      // SPÉCIALITÉ - Tester tous les champs possibles
      let specialite = ""

      // Test 1: Champ original du CSV
      if (luminaire["Spécialité"] && String(luminaire["Spécialité"]).trim() !== "") {
        specialite = String(luminaire["Spécialité"]).trim()
      }
      // Test 2: Champ periode (potentiellement modifié)
      else if (luminaire.periode && String(luminaire.periode).trim() !== "") {
        specialite = String(luminaire.periode).trim()
      }
      // Test 3: Champ specialty (potentiellement modifié)
      else if (luminaire.specialty && String(luminaire.specialty).trim() !== "") {
        specialite = String(luminaire.specialty).trim()
      }
      // Test 4: Champ specialite (potentiellement modifié)
      else if (luminaire.specialite && String(luminaire.specialite).trim() !== "") {
        specialite = String(luminaire.specialite).trim()
      }

      // COLLABORATION / ŒUVRE - Tester tous les champs possibles
      let collaboration = ""

      // Test 1: Champ original du CSV
      if (luminaire["Collaboration / Œuvre"] && String(luminaire["Collaboration / Œuvre"]).trim() !== "") {
        collaboration = String(luminaire["Collaboration / Œuvre"]).trim()
      }
      // Test 2: Champ collaboration (potentiellement modifié)
      else if (luminaire.collaboration && String(luminaire.collaboration).trim() !== "") {
        collaboration = String(luminaire.collaboration).trim()
      }

      // MATÉRIAUX
      let materiaux = ""
      if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
        materiaux = luminaire.materiaux.join(", ")
      } else if (luminaire.materials && String(luminaire.materials).trim() !== "") {
        materiaux = String(luminaire.materials).trim()
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
      if (index < 5) {
        console.log(`📋 Luminaire ${index + 1} - Résultat final:`, {
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
    console.log("📋 Exemples de données exportées:")
    csvData.slice(0, 3).forEach((row, idx) => {
      console.log(`Exemple ${idx + 1}:`, {
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
