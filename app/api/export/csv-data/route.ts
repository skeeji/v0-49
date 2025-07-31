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
      console.log(`🔍 Luminaire ${index + 1} - Clés disponibles:`, Object.keys(luminaire))
      console.log(`🔍 Luminaire ${index + 1} - Valeurs collaboration/spécialité:`, {
        collaboration: luminaire.collaboration,
        "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"],
        specialite: luminaire.specialite,
        periode: luminaire.periode,
        Spécialité: luminaire["Spécialité"],
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

      // LOGIQUE CORRIGÉE POUR SPÉCIALITÉ - Chercher dans tous les champs possibles
      let specialite = ""
      // Priorité 1: champ 'specialite' (modifié via l'interface)
      if (
        luminaire.specialite !== undefined &&
        luminaire.specialite !== null &&
        String(luminaire.specialite).trim() !== ""
      ) {
        specialite = String(luminaire.specialite).trim()
      }
      // Priorité 2: champ 'periode' (peut être utilisé comme spécialité)
      else if (
        luminaire.periode !== undefined &&
        luminaire.periode !== null &&
        String(luminaire.periode).trim() !== ""
      ) {
        specialite = String(luminaire.periode).trim()
      }
      // Priorité 3: champ original 'Spécialité'
      else if (
        luminaire["Spécialité"] !== undefined &&
        luminaire["Spécialité"] !== null &&
        String(luminaire["Spécialité"]).trim() !== ""
      ) {
        specialite = String(luminaire["Spécialité"]).trim()
      }

      // LOGIQUE CORRIGÉE POUR COLLABORATION / ŒUVRE - Chercher dans tous les champs possibles
      let collaboration = ""
      // Priorité 1: champ 'collaboration' (modifié via l'interface)
      if (
        luminaire.collaboration !== undefined &&
        luminaire.collaboration !== null &&
        String(luminaire.collaboration).trim() !== ""
      ) {
        collaboration = String(luminaire.collaboration).trim()
      }
      // Priorité 2: champ original 'Collaboration / Œuvre'
      else if (
        luminaire["Collaboration / Œuvre"] !== undefined &&
        luminaire["Collaboration / Œuvre"] !== null &&
        String(luminaire["Collaboration / Œuvre"]).trim() !== ""
      ) {
        collaboration = String(luminaire["Collaboration / Œuvre"]).trim()
      }

      // LOGIQUE POUR MATÉRIAUX
      let materiaux = ""
      // D'abord chercher dans 'materiaux' (liste)
      if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
        materiaux = luminaire.materiaux.join(", ")
      }
      // Sinon chercher dans 'Matériaux' (texte)
      else if (luminaire.Matériaux && String(luminaire.Matériaux).trim() !== "") {
        materiaux = String(luminaire.Matériaux).trim()
      }

      // Transformation des images en chaîne
      let images = ""
      if (Array.isArray(luminaire.images)) {
        images = luminaire.images.join(", ")
      } else if (luminaire.filename) {
        images = luminaire.filename
      }

      console.log(`📋 Luminaire ${index + 1} - Valeurs finales pour export:`, {
        nom: nom,
        specialite: specialite,
        collaboration: collaboration,
      })

      return {
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

    // Vérification détaillée des champs critiques
    const criticalFields = ["Spécialité", "Collaboration / Œuvre"]

    criticalFields.forEach((field) => {
      const filledCount = csvData.filter(
        (row) => row[field as keyof typeof row] && String(row[field as keyof typeof row]).trim() !== "",
      ).length
      console.log(`🔍 Champ "${field}": ${filledCount}/${csvData.length} entrées remplies`)

      // Afficher quelques exemples de valeurs
      const examples = csvData
        .filter((row) => row[field as keyof typeof row] && String(row[field as keyof typeof row]).trim() !== "")
        .slice(0, 5)
        .map((row, idx) => `${idx + 1}: "${row[field as keyof typeof row]}"`)

      if (examples.length > 0) {
        console.log(`📋 Exemples pour "${field}":`, examples)
      }
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
