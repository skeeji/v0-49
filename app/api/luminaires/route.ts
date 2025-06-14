import { NextResponse } from "next/server"
import clientPromise from "../../../lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE

if (!DBNAME) {
  throw new Error('Invalid/Missing environment variable: "MONGO_INITDB_DATABASE"')
}

// Gérer les requêtes GET pour récupérer les luminaires avec pagination
export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Vous pourrez ajouter vos filtres ici plus tard
    const query = {}; 
    
    const luminaires = await db.collection("luminaires")
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection("luminaires").countDocuments(query);

    return NextResponse.json({
      success: true,
      data: luminaires,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        pages: Math.ceil(total / limit),
      },
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
