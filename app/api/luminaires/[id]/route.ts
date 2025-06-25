// Fichier : app/api/luminaires/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { id } = params;
    const body = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 });
    }

    const { images } = body;

    if (!images || !Array.isArray(images)) {
        return NextResponse.json({ success: false, error: "Le champ 'images' doit être un tableau" }, { status: 400 });
    }

    const result = await db.collection("luminaires").updateOne(
      { _id: new ObjectId(id) },
      { $set: { images: images, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
        return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error(`Erreur API /api/luminaires/${params.id} PUT:`, error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
