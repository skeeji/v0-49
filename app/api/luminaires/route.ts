// Fichier : app/api/luminaires/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// FONCTION POST : Pour AJOUTER un luminaire
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const body = await request.json();

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

// FONCTION GET : Pour RÉCUPÉRER les luminaires (avec recherche, filtres, tri, pagination et optimisation)
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { searchParams } = new URL(request.url);

    // Ligne mise à jour comme demandé
    const isSimpleFetch = !searchParams.has("search") && !searchParams.has("designer") && !searchParams.has("page") && !searchParams.has("full");

    let query: any = {};
    const search = searchParams.get("search");
    if (search) {
        query.$or = [
            { nom: { $regex: search, $options: "i" } },
            { designer: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ];
    }

    const designer = searchParams.get("designer");
    if (designer) query.designer = designer;

    const anneeMin = searchParams.get("anneeMin");
    if (anneeMin) query.annee = { ...query.annee, $gte: parseInt(anneeMin) };

    const anneeMax = searchParams.get("anneeMax");
    if (anneeMax) query.annee = { ...query.annee, $lte: parseInt(anneeMax) };

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const sortField = searchParams.get("sortField") || "nom";
    const sortDirection = searchParams.get("sortDirection") === "desc" ? -1 : 1;
    const sortOptions = { [sortField]: sortDirection };

    const cursor = db.collection("luminaires").find(query);

    if (isSimpleFetch) {
      cursor.project({ designer: 1, images: 1, _id: 0 });
      console.log("Optimisation : Appel simple, projection des champs pour la page designers.");
    } else {
      cursor.sort(sortOptions).skip(skip).limit(limit);
    }

    const luminaires = await cursor.toArray();
    const total = await db.collection("luminaires").countDocuments(query);

    const pagination = {
        page,
        limit,
        pages: Math.ceil(total / limit),
        total,
    };

    return NextResponse.json({ success: true, luminaires, pagination });

  } catch (error) {
    console.error("Erreur API /api/luminaires GET:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
