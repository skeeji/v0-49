import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE;

if (!DBNAME) {
  throw new Error('Invalid/Missing environment variable: "MONGO_INITDB_DATABASE"');
}

// ========================================================================
// ✅ Gérer les requêtes GET pour récupérer les luminaires AVEC PAGINATION
// ========================================================================
export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const query = {}; // Vous pourrez ajouter vos filtres ici plus tard
    
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
    console.error("Erreur API [GET /api/luminaires]:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}


// ========================================================================
// ✅ Gérer les requêtes POST pour ajouter un luminaire
// ========================================================================
export async function POST(request: Request) {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)

    const luminaireData = await request.json()

    // La validation stricte sur le nom a été retirée pour autoriser l'import.
    
    // On s'assure que les dates de création et de mise à jour sont bien présentes
    const dataToInsert = {
      ...luminaireData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("luminaires").insertOne(dataToInsert)

    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error("Erreur API [POST /api/luminaires]:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}
