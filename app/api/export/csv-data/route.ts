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

      // Gestion des matériaux avec toutes les variantes possibles
      let materiaux = ""
      if (Array.isArray(luminaire.materiaux) && luminaire.materiaux.length > 0) {
        materiaux = luminaire.materiaux.join(", ")
      } else if (Array.isArray(luminaire.Matériaux) && luminaire.Matériaux.length > 0) {
        materiaux = luminaire.Matériaux.join(", ")
      } else if (typeof luminaire.materiaux === "string" && luminaire.materiaux.trim() !== "") {
        materiaux = luminaire.materiaux
      } else if (typeof luminaire.Matériaux === "string" && luminaire.Matériaux.trim() !== "") {
        materiaux = luminaire.Matériaux
      } else if (typeof luminaire.materials === "string" && luminaire.materials.trim() !== "") {
        materiaux = luminaire.materials
      }

      // Gestion de Collaboration / Œuvre avec toutes les variantes possibles
      let collaborationOeuvre = ""
      if (typeof luminaire.collaboration === "string" && luminaire.collaboration.trim() !== "") {
        collaborationOeuvre = luminaire.collaboration
      } else if (
        typeof luminaire["Collaboration / Œuvre"] === "string" &&
        luminaire["Collaboration / Œuvre"].trim() !== ""
      ) {
        collaborationOeuvre = luminaire["Collaboration / Œuvre"]
      } else if (typeof luminaire.oeuvre === "string" && luminaire.oeuvre.trim() !== "") {
        collaborationOeuvre = luminaire.oeuvre
      }

      return {
        // Colonnes dans l'ordre demandé
        ID: luminaire._id.toString(),
        "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
        "Artiste / Dates": luminaire.designer || luminaire.artist || luminaire["Artiste / Dates"] || "",
        Année: luminaire.annee || luminaire.year || luminaire["Année"] || "",
        Editeur: luminaire.editeur || luminaire.editor || luminaire["Editeur"] || "",
        Spécialité: luminaire.periode || luminaire.specialite || luminaire.specialty || luminaire["Spécialité"] || "",
        "Collaboration / Œuvre": collaborationOeuvre,
        Description: luminaire.description || luminaire.desc || luminaire["Description"] || "",
        Signé: luminaire.signe || luminaire.signed || luminaire["Signé"] || "",
        Dimensions: luminaire.dimensions || luminaire.dimension || luminaire["Dimensions"] || "",
        Matériaux: materiaux,
        Estimation: luminaire.estimation || luminaire.prix || luminaire.price || luminaire["Estimation"] || "",
        Prix: luminaire.estimation || luminaire.prix || luminaire.price || luminaire["Prix"] || "", // Même valeur que Estimation
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

    // Vérification des champs critiques
    const criticalFields = [
      "Nom luminaire",
      "Artiste / Dates",
      "Image luminaire",
      "Image designer",
      "Matériaux",
      "Collaboration / Œuvre",
    ]
    criticalFields.forEach((field) => {
      const hasData = csvData.some((row) => row[field as keyof typeof row] && row[field as keyof typeof row] !== "")
      console.log(`🔍 Champ "${field}": ${hasData ? "✅ Données présentes" : "⚠️ Aucune donnée"}`)
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
