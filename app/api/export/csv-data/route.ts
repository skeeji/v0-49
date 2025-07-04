import { type NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires";

/**
 * Formate une valeur pour l'inclure dans un champ CSV, en gérant les virgules et les guillemets.
 * @param value La valeur à formater.
 * @returns La valeur formatée et sécurisée pour le CSV.
 */
function formatCsvField(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  let stringValue = String(value);
  
  // Si la valeur contient une virgule, un guillemet ou un saut de ligne,
  // nous devons l'entourer de guillemets.
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Tout guillemet à l'intérieur doit être doublé.
    stringValue = stringValue.replace(/"/g, '""');
    return `"${stringValue}"`;
  }
  
  return stringValue;
}

export async function GET(request: NextRequest) {
  try {
    console.log("📤 Début de la génération de l'export CSV (méthode manuelle)...");

    const client = await clientPromise;
    const db = client.db(DBNAME);
    const collection = db.collection("luminaires");

    const luminaires = await collection.find({}).toArray();
    console.log(`📊 ${luminaires.length} luminaires récupérés.`);

    // Définir les en-têtes dans l'ordre final souhaité
    const headers = [
      "ID", "Nom luminaire", "Artiste / Dates", "Année", "Editeur", "Spécialité", 
      "Collaboration / Œuvre", "Description", "Signé", "Dimensions", "Matériaux", 
      "Estimation", "Prix", "Image luminaire", "Image designer"
    ];

    // Mapper les données en utilisant la logique de fallback pour chaque champ
    const dataRows = luminaires.map(luminaire => {
      const materiaux = Array.isArray(luminaire.materiaux) 
        ? luminaire.materiaux.join(", ") 
        : luminaire.Matériaux || luminaire.materiaux || "";
      const estimation = luminaire.estimation || luminaire.Estimation || luminaire.prix || luminaire.Prix || "";
      const imageLuminaire = luminaire.filename || (Array.isArray(luminaire.images) && luminaire.images.length > 0 ? luminaire.images[0] : "") || luminaire["Nom du fichier"] || "";
      const imageDesigner = luminaire.designerImageFilename || luminaire["Image Designer"] || "";

      // Créer un objet de données correspondant aux en-têtes
      const rowData = {
        "ID": luminaire._id ? luminaire._id.toString() : "",
        "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
        "Artiste / Dates": luminaire.designer || luminaire["Artiste / Dates"] || "",
        "Année": luminaire.annee || luminaire["Année"] || "",
        "Editeur": luminaire.editeur || luminaire["Editeur"] || "",
        "Spécialité": luminaire.periode || luminaire.specialite || luminaire["Spécialité"] || "",
        "Collaboration / Œuvre": luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
        "Description": luminaire.description || luminaire["Description"] || "",
        "Signé": luminaire.signe || luminaire["Signé"] || "",
        "Dimensions": luminaire.dimensions || luminaire["Dimensions"] || "",
        "Matériaux": materiaux,
        "Estimation": estimation,
        "Prix": estimation,
        "Image luminaire": imageLuminaire,
        "Image designer": imageDesigner,
      };
      
      // Transformer l'objet en tableau ordonné de valeurs formatées
      return headers.map(header => formatCsvField(rowData[header as keyof typeof rowData]));
    });

    // Construire le contenu CSV manuellement
    const headerRow = headers.join(',');
    const contentRows = dataRows.map(row => row.join(',')).join('\n');
    const csvContent = `${headerRow}\n${contentRows}`;
    
    console.log(`✅ CSV généré avec ${dataRows.length} lignes.`);
    
    const csvWithBOM = "\uFEFF" + csvContent; // BOM pour compatibilité Excel

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="export-luminaires-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });

  } catch (error: any) {
    console.error("❌ Erreur critique lors de la génération du CSV:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur lors de l'export CSV", details: error.message },
      { status: 500 }
    );
  }
}
