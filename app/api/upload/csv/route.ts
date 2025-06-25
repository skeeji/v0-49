// Fichier : app/api/upload/csv/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { parse } from "csv-parse/sync";

const DBNAME = "gersaint";

// Fonction utilitaire pour créer des slugs, maintenant sur le serveur
const createSlug = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Remplace les espaces par -
    .replace(/[^\w\-]+/g, "") // Supprime les caractères non valides
    .replace(/\-\-+/g, "-") // Remplace plusieurs - par un seul
    .replace(/^-+/, "") // Supprime les - au début
    .replace(/-+$/, ""); // Supprime les - à la fin

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as "luminaires" | "designers";

    if (!file || !type) {
      return NextResponse.json({ success: false, error: "Fichier ou type manquant." }, { status: 400 });
    }

    const fileContent = await file.text();
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ",", // Assurez-vous que votre CSV utilise bien la virgule comme délimiteur
    });

    const client = await clientPromise;
    const db = client.db(DBNAME);

    if (type === "luminaires") {
      const luminaireDocuments = records.map((record: any) => ({
        nom: record["Nom luminaire"] || record.filename?.replace(/\.[^/.]+$/, "") || "",
        designer: record["Artiste / Dates"] || "",
        specialite: record["Spécialité"] || "",
        collaboration: record["Collaboration / Œuvre"] || "",
        annee: record["Année"] ? parseInt(record["Année"], 10) : null,
        signe: record["Signé"] || "",
        filename: record["Nom du fichier"] || "",
        dimensions: record["Dimensions"] || "",
        estimation: record["Estimation"] || "",
        materiaux: record["Matériaux"] ? record["Matériaux"].split(",").map((m: string) => m.trim()) : [],
        images: [], // Le tableau d'images est initialement vide
        periode: record["Spécialité"] || "",
        description: `${record["Collaboration / Œuvre"] || ""} ${record["Spécialité"] || ""}`.trim(),
        createdAt: new Date(),
      }));

      if (luminaireDocuments.length > 0) {
        await db.collection("luminaires").insertMany(luminaireDocuments);
      }
      return NextResponse.json({ success: true, message: `${luminaireDocuments.length} luminaires importés.` });
    
    } else if (type === "designers") {
      const designerDocuments = records.map((record: any) => ({
        nom: record["Nom"] || "",
        imageFile: record["imagedesigner"] || "",
        slug: createSlug(record["Nom"] || ""), // Création du slug sur le serveur
        images: [],
      }));

      if (designerDocuments.length > 0) {
        // On utilise une opération "bulkWrite" pour insérer ou mettre à jour
        const operations = designerDocuments.map(doc => ({
            updateOne: {
                filter: { nom: doc.nom },
                update: { $set: doc },
                upsert: true
            }
        }));
        await db.collection("designers").bulkWrite(operations);
      }
      return NextResponse.json({ success: true, message: `${designerDocuments.length} designers importés.` });
    }

    return NextResponse.json({ success: false, error: "Type non supporté." }, { status: 400 });

  } catch (error) {
    console.error("❌ Erreur Import CSV:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de l'import CSV." }, { status: 500 });
  }
}
