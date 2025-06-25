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
    const artist = searchParams.get("artist");
    const yearMin = searchParams.get("yearMin");
    const yearMax = searchParams.get("yearMax");
    const period = searchParams.get("period");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const sort = searchParams.get("sort") || "name-asc";

    const query: any = {};

    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: "i" } },
        { designer: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (artist && artist !== "all") query.designer = artist;
    if (yearMin || yearMax) {
      query.annee = {};
      if (yearMin) query.annee.$gte = parseInt(yearMin, 10);
      if (yearMax) query.annee.$lte = parseInt(yearMax, 10);
    }
    if (period) query.periode = { $regex: period, $options: "i" };
    
    const sortConfig: any = {};
    const [sortField, sortOrder] = sort.split("-");
    sortConfig[sortField] = sortOrder === "desc" ? -1 : 1;
    
    const skip = (page - 1) * limit;

    const luminaires = await db.collection("luminaires").find(query).sort(sortConfig).skip(skip).limit(limit).toArray();
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
    console.error("❌ Erreur API /api/luminaires GET:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// Votre fonction POST existante est bonne, mais je la remets pour la complétude.
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const body = await request.json();

    // Logique d'import CSV ici
    const result = await db.collection("luminaires").insertOne(body);
    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
