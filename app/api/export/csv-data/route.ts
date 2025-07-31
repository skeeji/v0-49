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

    // UTILISATION DES MÊMES CLÉS QUE LE PDF DE LA PAGE ID
    const csvData = luminaires.map((luminaire, index) => {
      // Debug pour les premiers luminaires seulement
      if (index < 3) {
        console.log(`🔍 Luminaire ${index + 1} - Clés utilisées par le PDF:`, {
          nom: luminaire.nom || luminaire["Nom luminaire"],
          // CLÉS EXACTES UTILISÉES DANS LE PDF
          periode: luminaire.periode, // <- CLÉ POUR SPÉCIALITÉ
          collaboration: luminaire.collaboration, // <- CLÉ POUR COLLABORATION
          materiaux: luminaire.materiaux, // <- CLÉ POUR MATÉRIAUX
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

      // UTILISATION DES MÊMES CLÉS QUE LE PDF
      // Dans le PDF: luminaire.specialty (qui vient de periode)
      const specialite = String(luminaire.periode || luminaire["Spécialité"] || "").trim()

      // Dans le PDF: luminaire.collaboration (qui vient de collaboration)
      const collaboration = String(luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "").trim()

      // Dans le PDF: luminaire.materials (qui vient de materiaux)
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
        console.log(`📋 Luminaire ${index + 1} - Résultat final:`, {
          nom: result["Nom luminaire"],
          specialite: result["Spécialité"],
          collaboration: result["Collaboration / Œuvre"],
          materiaux: result["Matériaux"],
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
