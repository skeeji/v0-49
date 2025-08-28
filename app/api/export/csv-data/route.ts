import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📊 API /api/export/csv-data - Export des données CSV")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Récupérer tous les luminaires
    const luminaires = await collection.find({}).toArray()

    console.log(`✅ ${luminaires.length} luminaires récupérés pour l'export`)

    // Formater les données pour l'export CSV
    const formattedData = luminaires.map((luminaire) => ({
      _id: luminaire._id.toString(),
      nom: luminaire.nom || "",
      "Nom luminaire": luminaire["Nom luminaire"] || luminaire.nom || "",
      designer: luminaire.designer || "",
      "Artiste / Dates": luminaire["Artiste / Dates"] || luminaire.designer || "",
      annee: luminaire.annee || "",
      Année: luminaire["Année"] || luminaire.annee || "",
      periode: luminaire.periode || "",
      Spécialité: luminaire["Spécialité"] || luminaire.periode || "",
      categorie: luminaire.categorie || "",
      Catégorie: luminaire["Catégorie"] || luminaire.categorie || "",
      collaboration: luminaire.collaboration || "",
      "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"] || luminaire.collaboration || "",
      description: luminaire.description || "",
      Description: luminaire["Description"] || luminaire.description || "",
      signe: luminaire.signe || "",
      Signé: luminaire["Signé"] || luminaire.signe || "",
      dimensions: luminaire.dimensions || "",
      Dimensions: luminaire["Dimensions"] || luminaire.dimensions || "",
      materiaux: luminaire.materiaux || [],
      Matériaux:
        luminaire["Matériaux"] ||
        (Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join(", ") : luminaire.materiaux) ||
        "",
      estimation: luminaire.estimation || "",
      Estimation: luminaire["Estimation"] || luminaire.estimation || "",
      editeur: luminaire.editeur || "",
      Editeur: luminaire["Editeur"] || luminaire.editeur || "",
      filename: luminaire.filename || "",
      "Nom du fichier": luminaire["Nom du fichier"] || luminaire.filename || "",
      createdAt: luminaire.createdAt,
      updatedAt: luminaire.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur API /api/export/csv-data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export des données",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
