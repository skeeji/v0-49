// Fichier : app/api/upload/csv/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { parse } from "csv-parse/sync";

const DBNAME = "gersaint";

const createSlug = (text: string = "") =>
  text.toString().toLowerCase()
    .replace(/\s+/g, "-").replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as "luminaires" | "designers";

    if (!file || !type) {
      return NextResponse.json({ success: false, error: "Fichier ou type manquant." }, { status: 400 });
    }

    const fileContent = await file.text();
    const records = parse(fileContent, { columns: true, skip_empty_lines: true, delimiter: "," });

    const client = await clientPromise;
    const db = client.db(DBNAME);

    if (type === "luminaires") {
      const luminaireDocs = records.map((rec: any) => ({
        nom: rec["Nom luminaire"] || rec.filename?.replace(/\.[^/.]+$/, "") || "",
        designer: rec["Artiste / Dates"] || "",
        specialite: rec["Spécialité"] || "",
        collaboration: rec["Collaboration / Œuvre"] || "",
        annee: rec["Année"] ? parseInt(rec["Année"], 10) || null : null,
        signe: rec["Signé"] || "",
        filename: rec["Nom du fichier"] || "",
        dimensions: rec["Dimensions"] || "",
        estimation: rec["Estimation"] || "",
        materiaux: rec["Matériaux"] ? rec["Matériaux"].split(",").map((m: string) => m.trim()) : [],
        images: [],
        periode: rec["Spécialité"] || "",
        description: `${rec["Collaboration / Œuvre"] || ""} ${rec["Spécialité"] || ""}`.trim(),
        createdAt: new Date(),
      }));

      if (luminaireDocs.length > 0) await db.collection("luminaires").insertMany(luminaireDocs);
      return NextResponse.json({ success: true, message: `${luminaireDocs.length} luminaires importés.` });
    } 
    
    if (type === "designers") {
      const designerDocs = records.map((rec: any) => ({
        nom: rec["Nom"] || "",
        imageFile: rec["imagedesigner"] || "",
        slug: createSlug(rec["Nom"] || ""),
        images: [],
      }));

      if (designerDocs.length > 0) {
        const operations = designerDocs.map(doc => ({
            updateOne: { filter: { nom: doc.nom }, update: { $set: doc }, upsert: true }
        }));
        await db.collection("designers").bulkWrite(operations);
      }
      return NextResponse.json({ success: true, message: `${designerDocs.length} designers importés.` });
    }

    return NextResponse.json({ success: false, error: "Type non supporté." }, { status: 400 });
  } catch (error) {
    console.error("❌ Erreur Import CSV:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de l'import CSV." }, { status: 500 });
  }
}
