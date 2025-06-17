import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE!;

// Lire les luminaires avec pagination et filtres
export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;
    
    // Ici, vous ajouterez la logique de filtre/tri que vous aviez avant
    const query = {}; 

    const luminaires = await db.collection("luminaires").find(query).skip(skip).limit(limit).toArray();
    const total = await db.collection("luminaires").countDocuments(query);

    return NextResponse.json({
      success: true,
      data: luminaires,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}

// Créer un nouveau luminaire
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const luminaireData = await request.json();
    const dataToInsert = { ...luminaireData, createdAt: new Date(), updatedAt: new Date() };
    const result = await db.collection("luminaires").insertOne(dataToInsert);
    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}
