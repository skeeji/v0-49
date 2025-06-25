// Fichier : app/api/luminaires/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

// Gérer les requêtes GET pour récupérer un luminaire par ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db("gersaint");
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 });
    }
    const luminaire = await db.collection("luminaires").findOne({ _id: new ObjectId(params.id) });
    if (!luminaire) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: luminaire }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}

// Gérer les requêtes PUT pour mettre à jour un luminaire
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db("gersaint");
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 });
    }
    const body = await request.json();
    const { _id, ...updateData } = body; 
    const result = await db
      .collection("luminaires")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: updateData });
    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 });
    }
    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}

// Gérer les requêtes DELETE pour supprimer un luminaire
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db("gersaint");
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 });
    }
    const result = await db.collection("luminaires").deleteOne({ _id: new ObjectId(params.id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 });
    }
    return NextResponse.json({ success: true, deletedCount: result.deletedCount }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
