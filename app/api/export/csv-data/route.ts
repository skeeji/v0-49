import { type NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { stringify } from "csv-stringify/sync"; // Assurez-vous que 'csv-stringify' est installé

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires";

export async function GET(request: NextRequest) {
  try {
    console.log("📤 Début de la génération de l'export CSV unifié...");

    const client = await clientPromise;
    const db = client.db(DBNAME);
    const collection = db.collection("luminaires");

    // Étape 1: Récupérer TOUS les luminaires de la base
    const luminaires = await collection.find({}).toArray();
    console.log(`📊 ${luminaires.length} luminaires récupérés de la base de données.`);

    // Étape 2: Mapper les données en utilisant la logique de fallback pour chaque champ
    const dataForCsv = luminaires.map(luminaire => {
      
      // Logique pour les matériaux (gère les cas où c'est un tableau ou une chaîne)
      const materiaux = Array.isArray(luminaire.materiaux) 
        ? luminaire.materiaux.join(", ") 
        : luminaire.Matériaux || luminaire.materiaux || "";

      // Logique pour l'estimation et le prix (ils auront la même valeur)
      const estimation = luminaire.estimation || luminaire.Estimation || luminaire.prix || luminaire.Prix || "";

      // Logique pour l'image principale du luminaire
      const imageLuminaire = luminaire.filename || (Array.isArray(luminaire.images) && luminaire.images.length > 0 ? luminaire.images[0] : "") || luminaire["Nom du fichier"] || "";

      // Logique pour l'image du designer
      const imageDesigner = luminaire.designerImageFilename || luminaire["Image Designer"] || "";

      return {
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
        "Prix": estimation, // La colonne Prix prend la valeur de l'Estimation
        "Image luminaire": imageLuminaire,
        "Image designer": imageDesigner,
      };
    });

    // Étape 3: Définir les en-têtes dans l'ordre final souhaité
    const headers = [
      "ID", "Nom luminaire", "Artiste / Dates", "Année", "Editeur", "Spécialité", 
      "Collaboration / Œuvre", "Description", "Signé", "Dimensions", "Matériaux", 
      "Estimation", "Prix", "Image luminaire", "Image designer"
    ];

    // Étape 4: Générer le contenu CSV de manière sécurisée
    const csvContent = stringify(dataForCsv, {
      header: true,
      columns: headers,
      quoted: true,
    });

    console.log(`✅ CSV généré avec ${dataForCsv.length} lignes.`);
    
    // Ajout du BOM UTF-8 pour une meilleure compatibilité avec Excel
    const csvWithBOM = "\uFEFF" + csvContent;

    // Étape 5: Retourner le fichier
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
