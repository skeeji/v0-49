// Fichier : app/api/designers/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET pour récupérer tous les designers
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const designers = await db.collection("designers").find({}).toArray();

    // CORRECTION : On renvoie les données dans le champ "designers"
    return NextResponse.json({ success: true, designers: designers }); 
  } catch (error) {
    console.error("Erreur API /api/designers GET:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// POST pour ajouter un designer (conservé)
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const designerData = await request.json();

    if (!designerData.nom) {
      return NextResponse.json({ success: false, error: "Le nom du designer est requis" }, { status: 400 });
    }
    
    // On s'assure que le slug est bien là avant d'insérer
    if (!designerData.slug) {
        return NextResponse.json({ success: false, error: "Le slug est manquant" }, { status: 400 });
    }

    const result = await db.collection("designers").insertOne({ ...designerData, createdAt: new Date() });
    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("Erreur API /api/designers POST:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
