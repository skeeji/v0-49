// Fichier : app/api/luminaires/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DBNAME = "gersaint";

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    
    let query: any = {};
    if (search) {
      query = { 
        $or: [
            { nom: { $regex: search, $options: "i" } },
            { designer: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ]
      };
    }

    const skip = (page - 1) * limit;

    const luminaires = await db.collection("luminaires").find(query).sort({ annee: -1 }).skip(skip).limit(limit).toArray();
    const totalLuminaires = await db.collection("luminaires").countDocuments(query);
    
    return NextResponse.json({
      success: true,
      luminaires,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLuminaires / limit),
        totalLuminaires,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// La fonction POST ici est un fallback si vous voulez ajouter un luminaire manuellement via API
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const body = await request.json();
    const result = await db.collection("luminaires").insertOne(body);
    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
