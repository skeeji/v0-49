// Fichier : app/api/luminaires/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// FONCTION POST : Pour AJOUTER un luminaire
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(); // Utilise la DB de votre MONGODB_URI
    const body = await request.json();

    // CHANGEMENT : On ne vérifie plus le nom, mais on s'assure qu'il y a au moins un nom de fichier.
    if (!body.filename) {
      return NextResponse.json({ success: false, error: "Le nom de fichier est requis pour la liaison d'image" }, { status: 400 });
    }

    const result = await db.collection("luminaires").insertOne(body);

    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("Erreur API /api/luminaires POST:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// FONCTION GET : Pour RÉCUPÉRER les luminaires
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // On récupère tous les luminaires, triés par année (plus récent en premier)
    const luminaires = await db.collection("luminaires").find({}).sort({ annee: -1 }).toArray();

    return NextResponse.json({ success: true, luminaires });
  } catch (error) {
    console.error("Erreur API /api/luminaires GET:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
