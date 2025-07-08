import { type NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires";

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/csv-data - Export CSV avec colonnes spécifiques");

    const client = await clientPromise;
    const db = client.db(DBNAME);
    const collection = db.collection("luminaires");

    // Récupérer toutes les données depuis MongoDB
    const luminaires = await collection.find({}).toArray();
    console.log(`📊 ${luminaires.length} luminaires récupérés pour export CSV`);

    // CORRECTION: Le bloc suivant est remplacé par la nouvelle logique de mapping rétro-compatible.
    const csvData = luminaires.map((luminaire: any) => {
      // Logique de fallback pour lire les anciens et nouveaux formats
      const nom = luminaire.nom || luminaire["Nom luminaire"] || "";
      const designer = luminaire.designer || luminaire["Artiste / Dates"] || "";
      const annee = luminaire.annee || luminaire["Année"] || "";
      const editeur = luminaire.editeur || "";
      const specialite = luminaire.periode || luminaire["Spécialité"] || "";
      const collaboration = luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "";
      const description = luminaire.description || "";
      const signe = luminaire.signe || luminaire["Signé"] || "";
      const dimensions = luminaire.dimensions || "";
      const estimation = luminaire.estimation || luminaire.Prix || "";

      // Transformation des tableaux en chaînes de caractères pour le CSV
      const materiaux = Array.isArray(luminaire.materiaux)
        ? luminaire.materiaux.join(", ")
        : luminaire.Matériaux || ""; // Fallback pour les anciennes données

      const images = Array.isArray(luminaire.images)
        ? luminaire.images.join(", ")
        : luminaire.filename || ""; // Fallback pour les anciennes données

      return {
        "ID": luminaire._id.toString(),
        "Nom luminaire": nom,
        "Artiste / Dates": designer,
        "Année": annee,
        "Editeur": editeur,
        "Spécialité": specialite,
        "Collaboration / Œuvre": collaboration,
        "Description": description,
        "Signé": signe,
        "Dimensions": dimensions,
        "Matériaux": materiaux,
        "Estimation": estimation,
        "Prix": estimation, // Le prix est mappé sur l'estimation
        "Image luminaire": images,
        "Image designer": luminaire.designerImageFilename || "",
      };
    });

    if (csvData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée à exporter" }, { status: 404 });
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
    ];

    // Créer le contenu CSV
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] || "";
            // Échapper les guillemets en les doublant et entourer chaque champ de guillemets
            const cleanValue = String(value).replace(/"/g, '""');
            return `"${cleanValue}"`;
          })
          .join(","),
      ),
    ].join("\n");

    console.log(`✅ Export CSV généré avec ${csvData.length} luminaires et ${headers.length} colonnes`);

    // Vérification détaillée des champs critiques
    const criticalFields = [
      "Nom luminaire",
      "Artiste / Dates",
      "Matériaux",
      "Collaboration / Œuvre",
      "Spécialité",
      "Signé",
    ];

    criticalFields.forEach((field) => {
      const filledCount = csvData.filter(
        (row) => row[field as keyof typeof row] && String(row[field as keyof typeof row]).trim() !== "",
      ).length;
      console.log(`🔍 Champ "${field}": ${filledCount}/${csvData.length} entrées remplies`);

      // Afficher quelques exemples de valeurs
      const examples = csvData
        .filter((row) => row[field as keyof typeof row] && String(row[field as keyof typeof row]).trim() !== "")
        .slice(0, 3)
        .map((row) => row[field as keyof typeof row]);

      if (examples.length > 0) {
        console.log(`📋 Exemples pour "${field}":`, examples);
      }
    });

    // Retourner le CSV avec BOM UTF-8 pour une meilleure compatibilité avec Excel
    const csvWithBOM = "\uFEFF" + csvContent;

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="luminaires-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("❌ Erreur export CSV:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export CSV",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
