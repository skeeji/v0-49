import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/csv-data - Export CSV avec TOUTES les données")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Récupérer TOUS les luminaires avec TOUS les champs
    const luminaires = await collection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires trouvés pour l'export CSV complet`)

    // MODIFICATION 3: Formater les données avec TOUS les champs pour l'export CSV
    const csvData = luminaires.map((luminaire) => ({
      // Champs principaux
      ID: luminaire._id.toString(),
      "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
      "Artiste / Dates": luminaire.designer || luminaire["Artiste / Dates"] || "",
      Année: luminaire.annee || luminaire["Année"] || "",
      Spécialité: luminaire.periode || luminaire["Spécialité"] || "",

      // MODIFICATION 3: Champs COMPLÈTEMENT séparés dans l'export
      "Collaboration / Œuvre": luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
      Description: luminaire.description || "", // Description SÉPARÉE de collaboration

      Signé: luminaire.signe || luminaire["Signé"] || "",

      // MODIFICATION 3: TOUS les champs étendus dans l'export CSV
      Editeur: luminaire.editeur || "",
      Dimensions: luminaire.dimensions || luminaire["Dimensions"] || "",
      Matériaux: Array.isArray(luminaire.materiaux)
        ? luminaire.materiaux.join(", ")
        : luminaire.materiaux || luminaire["Matériaux"] || "",
      Estimation: luminaire.estimation || luminaire["Estimation"] || "",

      // Images principales
      "Nom du fichier": luminaire.filename || luminaire["Nom du fichier"] || "",
      Images: Array.isArray(luminaire.images) ? luminaire.images.join(", ") : luminaire.images || "",

      // MODIFICATION 3: Image du designer dans l'export CSV
      "Image Designer": luminaire.designerImageFilename || luminaire.designerImage || "",

      // Couleurs
      Couleurs: Array.isArray(luminaire.couleurs) ? luminaire.couleurs.join(", ") : luminaire.couleurs || "",

      // Métadonnées
      Favori: luminaire.isFavorite ? "Oui" : "Non",
      "Date création": luminaire.createdAt ? new Date(luminaire.createdAt).toLocaleDateString("fr-FR") : "",
      "Date modification": luminaire.updatedAt ? new Date(luminaire.updatedAt).toLocaleDateString("fr-FR") : "",

      // Champs techniques supplémentaires
      "ID MongoDB": luminaire._id.toString(),
      Statut: luminaire.status || "Actif",
      Tags: Array.isArray(luminaire.tags) ? luminaire.tags.join(", ") : luminaire.tags || "",
    }))

    // Créer le contenu CSV
    if (csvData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée à exporter" }, { status: 404 })
    }

    // Créer les en-têtes CSV
    const headers = Object.keys(csvData[0])

    // Créer les lignes CSV avec échappement correct
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] || ""
            // Échapper les guillemets et virgules pour CSV
            const cleanValue = String(value).replace(/"/g, '""')
            return `"${cleanValue}"`
          })
          .join(","),
      ),
    ].join("\n")

    console.log(`✅ Export CSV généré avec ${csvData.length} luminaires et ${headers.length} colonnes`)
    console.log(`📋 Colonnes exportées:`, headers)

    // Retourner le CSV avec BOM UTF-8 pour Excel
    const csvWithBOM = "\uFEFF" + csvContent

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="luminaires-export-complet-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur export CSV complet:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export CSV complet",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
