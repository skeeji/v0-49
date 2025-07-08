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

    const csvData = luminaires.map((luminaire) => {
      // Les données sont maintenant propres et standardisées
      const materiauxString = Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join(", ") : ""
      const imagesString = Array.isArray(luminaire.images) ? luminaire.images.join(", ") : ""

      return {
        ID: luminaire._id.toString(),
        "Nom luminaire": luminaire.nom || "",
        "Artiste / Dates": luminaire.designer || "",
        Année: luminaire.annee || "",
        Editeur: luminaire.editeur || "",
        Spécialité: luminaire.periode || "", // Lecture du champ simple
        "Collaboration / Œuvre": luminaire.collaboration || "", // Lecture du champ simple
        Description: luminaire.description || "",
        Signé: luminaire.signe || "",
        Dimensions: luminaire.dimensions || "",
        Matériaux: materiauxString, // Lecture du champ simple, transformé en string
        Estimation: luminaire.estimation || "",
        Prix: luminaire.estimation || "", // Utilise la même valeur
        "Image luminaire": imagesString,
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
