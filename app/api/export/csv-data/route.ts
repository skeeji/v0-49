import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/csv-data - Export CSV avec colonnes spécifiques")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Récupérer toutes les données depuis MongoDB avec tri pour éviter les doublons
    const luminaires = await collection.find({}).sort({ _id: 1 }).toArray()
    console.log(`📊 ${luminaires.length} luminaires récupérés pour export CSV`)

    // LOGIQUE CORRIGÉE POUR L'EXPORT CSV
    const csvData = luminaires.map((luminaire, index) => {
      console.log(`🔍 Luminaire ${index + 1}:`, {
        nom: luminaire.nom,
        collaboration: luminaire.collaboration,
        specialite: luminaire.specialite,
        periode: luminaire.periode,
        toutesLesCles: Object.keys(luminaire),
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

      // LOGIQUE CORRIGÉE POUR SPÉCIALITÉ - Priorité aux champs modifiés
      let specialite = ""
      if (luminaire.specialite && String(luminaire.specialite).trim() !== "") {
        specialite = String(luminaire.specialite).trim()
      } else if (luminaire.periode && String(luminaire.periode).trim() !== "") {
        specialite = String(luminaire.periode).trim()
      } else if (luminaire["Spécialité"] && String(luminaire["Spécialité"]).trim() !== "") {
        specialite = String(luminaire["Spécialité"]).trim()
      }

      // LOGIQUE CORRIGÉE POUR COLLABORATION / ŒUVRE - Priorité aux champs modifiés
      let collaboration = ""
      if (luminaire.collaboration && String(luminaire.collaboration).trim() !== "") {
        collaboration = String(luminaire.collaboration).trim()
      } else if (luminaire["Collaboration / Œuvre"] && String(luminaire["Collaboration / Œuvre"]).trim() !== "") {
        collaboration = String(luminaire["Collaboration / Œuvre"]).trim()
      }

      // LOGIQUE CORRIGÉE POUR MATÉRIAUX
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

      console.log(`📋 Luminaire ${index + 1} - Valeurs finales:`, {
        nom: nom,
        specialite: specialite,
        collaboration: collaboration,
        materiaux: materiaux,
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
    const criticalFields = [
      "Nom luminaire",
      "Artiste / Dates",
      "Matériaux",
      "Collaboration / Œuvre",
      "Spécialité",
      "Signé",
    ]

    criticalFields.forEach((field) => {
      const filledCount = csvData.filter(
        (row) => row[field as keyof typeof row] && String(row[field as keyof typeof row]).trim() !== "",
      ).length
      console.log(`🔍 Champ "${field}": ${filledCount}/${csvData.length} entrées remplies`)

      // Afficher quelques exemples de valeurs
      const examples = csvData
        .filter((row) => row[field as keyof typeof row] && String(row[field as keyof typeof row]).trim() !== "")
        .slice(0, 3)
        .map((row) => row[field as keyof typeof row])

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
