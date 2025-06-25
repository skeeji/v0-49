// Fichier : app/api/designers/[name]/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET pour récupérer UN SEUL designer par son SLUG
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } } // Le paramètre s'appelle 'name' d'après le nom du dossier
) {
  try {
    const client = await clientPromise;
    const db = client.db("gersaint"); // Spécifier la base de données est plus sûr

    // --- CORRECTION : Décodage du slug ---
    const slug = decodeURIComponent(params.name);

    // On cherche le designer qui a le bon slug
    const designer = await db.collection("designers").findOne({ slug: slug });

    if (!designer) {
      return NextResponse.json({ success: false, error: "Designer non trouvé avec ce slug" }, { status: 404 });
    }

    // On cherche aussi les luminaires associés à ce designer (par son nom complet)
    const luminaires = await db.collection("luminaires").find({ designer: designer.nom }).toArray();

    return NextResponse.json({
      success: true,
      data: {
        designer,
        luminaires,
      },
    });
  } catch (error) {
    console.error("Erreur API /api/designers/[slug] GET:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT pour mettre à jour un designer par son SLUG (pour les images)
export async function PUT(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("gersaint");
    
    // --- CORRECTION : Décodage du slug ---
    const slug = decodeURIComponent(params.name);
    const body = await request.json();

    const { _id, nom, ...updateData } = body;

    const result = await db.collection("designers").updateOne(
      { slug: slug },
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
