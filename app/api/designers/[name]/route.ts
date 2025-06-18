// Fichier : app/api/designers/[name]/route.ts

import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb" // Chemin corrigé pour la cohérence

// GET pour récupérer un designer par nom
export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const client = await clientPromise
    const db = client.db() // CORRECTION : Utilise la DB de l'URI
    const decodedName = decodeURIComponent(params.name)
    const designer = await db.collection("designers").findOne({ nom: decodedName })

    if (!designer) {
      return NextResponse.json({ success: false, error: "Designer non trouvé" }, { status: 404 })
    }
    return NextResponse.json({ success: true, designer: designer }, { status: 200 }) // Simplifié pour ne renvoyer que le designer
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}

// PUT pour mettre à jour un designer (AJOUTÉ)
export async function PUT(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const name = decodeURIComponent(params.name);
    const body = await request.json();

    const { _id, nom, ...updateData } = body;

    const result = await db.collection("designers").updateOne(
      { nom: name }, // On trouve le designer par son nom
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Designer non trouvé pour la mise à jour" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error(`Erreur API /api/designers/${params.name} PUT:`, error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
