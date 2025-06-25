// Fichier : app/api/luminaires/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DBNAME = "gersaint";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    if (!ObjectId.isValid(params.id)) return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 });
    const luminaire = await db.collection("luminaires").findOne({ _id: new ObjectId(params.id) });
    if (!luminaire) return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 });
    return NextResponse.json({ success: true, data: luminaire });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    if (!ObjectId.isValid(params.id)) return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 });
    const body = await req.json();
    const { _id, ...updateData } = body;
    const result = await db.collection("luminaires").updateOne({ _id: new ObjectId(params.id) }, { $set: updateData });
    if (result.matchedCount === 0) return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 });
    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const client = await clientPromise;
        const db = client.db(DBNAME);
        if (!ObjectId.isValid(params.id)) return NextResponse.json({ success: false, error: "ID invalide" }, { status: 400 });
        
        // Avant de supprimer le document, on supprime ses images de GridFS
        const luminaire = await db.collection("luminaires").findOne({ _id: new ObjectId(params.id) });
        if (luminaire?.images && luminaire.images.length > 0) {
            const bucket = await getBucket();
            for (const imageUrl of luminaire.images) {
                const fileId = new ObjectId(imageUrl.split('/').pop());
                await bucket.delete(fileId);
            }
        }

        const result = await db.collection("luminaires").deleteOne({ _id: new ObjectId(params.id) });
        if (result.deletedCount === 0) return NextResponse.json({ success: false, error: "Luminaire non trouvé" }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
    }
}
