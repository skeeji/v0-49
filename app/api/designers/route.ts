// Fichier : app/api/designers/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET pour récupérer tous les designers
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(); // CORRECTION : Utilise la base de données de l'URI de connexion
    const designers = await db.collection("designers").find({}).toArray();

    // CORRECTION : Renvoie les données dans le champ "designers" pour être cohérent
    return NextResponse.json({ success: true, designers: designers }); 
  } catch (error) {
    console.error("Erreur API /api/designers GET:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// POST pour ajouter un designer
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const designerData = await request.json();

    if (!designerData.nom) {
      return NextResponse.json({ success: false, error: "Le nom du designer est requis" }, { status: 400 });
    }
    
    const result = await db.collection("designers").insertOne({ ...designerData, createdAt: new Date() });
    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("Erreur API /api/designers POST:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
