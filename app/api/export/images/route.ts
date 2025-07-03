import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/images - Export CSV avec toutes les données")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Récupérer TOUS les luminaires
    const luminaires = await collection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires trouvés pour l'export`)

    // CORRECTION: Formater les données avec TOUS les champs pour l'export CSV
    const csvData = luminaires.map((luminaire) => ({
      // Champs principaux
      ID: luminaire._id.toString(),
      "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
      "Artiste / Dates": luminaire.designer || luminaire["Artiste / Dates"] || "",
      Année: luminaire.annee || luminaire["Année"] || "",
      Spécialité: luminaire.periode || luminaire["Spécialité"] || "",

      // CORRECTION: Champs séparés dans l'export
      "Collaboration / Œuvre": luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
      Description: luminaire.description || "", // Description séparée

      Signé: luminaire.signe || luminaire["Signé"] || "",

      // CORRECTION: Tous les champs étendus dans l'export
      Editeur: luminaire.editeur || "",
      Dimensions: luminaire.dimensions || "",
      Matériaux: Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join(", ") : luminaire.materiaux || "",
      Estimation: luminaire.estimation || "",

      // Images
      "Nom du fichier": luminaire.filename || luminaire["Nom du fichier"] || "",
      Images: Array.isArray(luminaire.images) ? luminaire.images.join(", ") : luminaire.images || "",

      // CORRECTION: Image du designer dans l'export
      "Image Designer": luminaire.designerImageFilename || "",

      // Couleurs
      Couleurs: Array.isArray(luminaire.couleurs) ? luminaire.couleurs.join(", ") : luminaire.couleurs || "",

      // Métadonnées
      Favori: luminaire.isFavorite ? "Oui" : "Non",
      "Date création": luminaire.createdAt ? new Date(luminaire.createdAt).toLocaleDateString("fr-FR") : "",
      "Date modification": luminaire.updatedAt ? new Date(luminaire.updatedAt).toLocaleDateString("fr-FR") : "",
    }))

    // Créer le contenu CSV
    if (csvData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée à exporter" }, { status: 404 })
    }

    // Créer les en-têtes CSV
    const headers = Object.keys(csvData[0])

    // Créer les lignes CSV
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] || ""
            // Échapper les guillemets et virgules
            return `"${String(value).replace(/"/g, '""')}"`
          })
          .join(","),
      ),
    ].join("\n")

    console.log(`✅ Export CSV généré avec ${csvData.length} luminaires et ${headers.length} colonnes`)

    // Retourner le CSV
    return new NextResponse(csvContent, {
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
