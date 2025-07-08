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

      // RÉCUPÉRATION DIRECTE DES MATÉRIAUX avec ordre de priorité
      let materiaux = ""
      const materiauxValue = luminaire.Matériaux || luminaire.materiaux || luminaire.materials
      if (Array.isArray(materiauxValue) && materiauxValue.length > 0) {
        materiaux = materiauxValue.join(", ")
      } else if (typeof materiauxValue === "string" && materiauxValue.trim() !== "") {
        materiaux = materiauxValue.trim()
      }

      // RÉCUPÉRATION DIRECTE DE COLLABORATION / ŒUVRE avec ordre de priorité
      let collaborationOeuvre = ""
      const collaborationValue = luminaire["Collaboration / Œuvre"] || luminaire.collaboration || luminaire.oeuvre
      if (typeof collaborationValue === "string" && collaborationValue.trim() !== "") {
        collaborationOeuvre = collaborationValue.trim()
      }

      // RÉCUPÉRATION DIRECTE DE SPÉCIALITÉ avec ordre de priorité
      let specialite = ""
      const specialiteValue = luminaire.Spécialité || luminaire.specialite || luminaire.periode || luminaire.Période
      if (typeof specialiteValue === "string" && specialiteValue.trim() !== "") {
        specialite = specialiteValue.trim()
      }

      // RÉCUPÉRATION DIRECTE DE SIGNÉ avec ordre de priorité
      let signe = ""
      const signeValue = luminaire.Signé || luminaire.signe || luminaire.signed
      if (typeof signeValue === "string" && signeValue.trim() !== "") {
        signe = signeValue.trim()
      }

      console.log(`🎯 RÉSULTATS pour ${luminaire.nom}:`, {
        materiaux: materiaux || "❌ VIDE",
        collaborationOeuvre: collaborationOeuvre || "❌ VIDE",
        specialite: specialite || "❌ VIDE",
        signe: signe || "❌ VIDE",
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
