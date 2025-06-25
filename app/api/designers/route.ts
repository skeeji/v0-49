// Fichier : app/api/designers/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DBNAME = "gersaint";

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const designers = await db.collection("designers").find({}).sort({ nom: 1 }).toArray();
    return NextResponse.json({ success: true, designers: designers });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const body = await request.json();
    const result = await db.collection("designers").insertOne(body);
    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
