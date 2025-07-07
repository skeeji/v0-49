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

    // Mapping des champs selon les colonnes demandées
    const csvData = luminaires.map((luminaire, index) => {
      console.log(`📝 Traitement luminaire ${index + 1}/${luminaires.length}: ${luminaire.nom || "Sans nom"}`)

      // Debug complet de TOUTES les clés disponibles
      console.log(`🔍 TOUTES les clés disponibles:`, Object.keys(luminaire))
      console.log(`🔍 Valeurs spécifiques:`, {
        materiaux: luminaire.materiaux,
        Matériaux: luminaire.Matériaux,
        materials: luminaire.materials,
        collaboration: luminaire.collaboration,
        "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"],
        oeuvre: luminaire.oeuvre,
        periode: luminaire.periode,
        specialite: luminaire.specialite,
        Spécialité: luminaire.Spécialité,
        signe: luminaire.signe,
        signed: luminaire.signed,
        Signé: luminaire.Signé,
      })

      // Gestion des images du luminaire (tableau)
      let imagesLuminaire = ""
      if (luminaire.filename) {
        imagesLuminaire = luminaire.filename
      }
      if (luminaire.images && Array.isArray(luminaire.images) && luminaire.images.length > 0) {
        if (imagesLuminaire) {
          imagesLuminaire += ", " + luminaire.images.join(", ")
        } else {
          imagesLuminaire = luminaire.images.join(", ")
        }
      }

      // Gestion de l'image designer (une seule image)
      const imageDesigner =
        luminaire.designerImageFilename ||
        luminaire.designerImage ||
        luminaire["Image Designer"] ||
        luminaire["designer.jpg"] ||
        luminaire.image_designer ||
        ""

      // Gestion des matériaux - TOUTES LES VARIANTES POSSIBLES
      let materiaux = ""
      const materiauxKeys = ["materiaux", "Matériaux", "materials", "Materials", "matériaux", "MATERIAUX", "MATERIALS"]

      for (const key of materiauxKeys) {
        if (luminaire[key]) {
          if (Array.isArray(luminaire[key]) && luminaire[key].length > 0) {
            materiaux = luminaire[key].join(", ")
            break
          } else if (typeof luminaire[key] === "string" && luminaire[key].trim() !== "") {
            materiaux = luminaire[key].trim()
            break
          }
        }
      }

      // Gestion de Collaboration / Œuvre - TOUTES LES VARIANTES POSSIBLES
      let collaborationOeuvre = ""
      const collaborationKeys = [
        "collaboration",
        "Collaboration / Œuvre",
        "oeuvre",
        "Œuvre",
        "collaboration_oeuvre",
        "COLLABORATION",
        "OEUVRE",
      ]

      for (const key of collaborationKeys) {
        if (luminaire[key] && typeof luminaire[key] === "string" && luminaire[key].trim() !== "") {
          collaborationOeuvre = luminaire[key].trim()
          break
        }
      }

      // Gestion de Spécialité - TOUTES LES VARIANTES POSSIBLES
      let specialite = ""
      const specialiteKeys = ["periode", "specialite", "Spécialité", "specialty", "Specialty", "SPECIALITE", "PERIODE"]

      for (const key of specialiteKeys) {
        if (luminaire[key] && typeof luminaire[key] === "string" && luminaire[key].trim() !== "") {
          specialite = luminaire[key].trim()
          break
        }
      }

      // Gestion de Signé - TOUTES LES VARIANTES POSSIBLES
      let signe = ""
      const signeKeys = ["signe", "signed", "Signé", "SIGNE", "SIGNED"]

      for (const key of signeKeys) {
        if (luminaire[key] && typeof luminaire[key] === "string" && luminaire[key].trim() !== "") {
          signe = luminaire[key].trim()
          break
        }
      }

      console.log(`✅ Résultats finaux pour ${luminaire.nom}:`, {
        materiaux,
        collaborationOeuvre,
        specialite,
        signe,
      })

      return {
        // Colonnes dans l'ordre demandé
        ID: luminaire._id.toString(),
        "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
        "Artiste / Dates": luminaire.designer || luminaire.artist || luminaire["Artiste / Dates"] || "",
        Année: luminaire.annee || luminaire.year || luminaire["Année"] || "",
        Editeur: luminaire.editeur || luminaire.editor || luminaire["Editeur"] || "",
        Spécialité: specialite,
        "Collaboration / Œuvre": collaborationOeuvre,
        Description: luminaire.description || luminaire.desc || luminaire["Description"] || "",
        Signé: signe,
        Dimensions: luminaire.dimensions || luminaire.dimension || luminaire["Dimensions"] || "",
        Matériaux: materiaux,
        Estimation: luminaire.estimation || luminaire.prix || luminaire.price || luminaire["Estimation"] || "",
        Prix: luminaire.estimation || luminaire.prix || luminaire.price || luminaire["Prix"] || "",
        "Image luminaire": imagesLuminaire,
        "Image designer": imageDesigner,
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
