// Fichier : app/api/luminaires/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// FONCTION POST : Pour AJOUTER un luminaire (INCHANGÉE)
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("gersaint");
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


// --- CORRECTION DE LA FONCTION GET AVEC PAGINATION ---
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("gersaint");
    
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10); // Augmenté pour votre usage
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      // Pour la recherche, on peut chercher dans plusieurs champs
      query = { 
        $or: [
            { nom: { $regex: search, $options: "i" } },
            { designer: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ]
      };
    }

    const luminaires = await db.collection("luminaires")
      .find(query)
      .sort({ annee: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalLuminaires = await db.collection("luminaires").countDocuments(query);
    const totalPages = Math.ceil(totalLuminaires / limit);

    return NextResponse.json({ 
      success: true, 
      luminaires,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalLuminaires: totalLuminaires
      }
    });
  } catch (error) {
    console.error("Erreur API /api/luminaires GET:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
