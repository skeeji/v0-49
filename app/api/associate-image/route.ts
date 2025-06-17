import { type NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE!;

export async function POST(request: NextRequest) {
  try {
    const { entity, matchField, matchValue, imageId } = await request.json();
    if (!entity || !matchField || !matchValue || !imageId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DBNAME);

    const result = await db.collection(entity).updateOne(
      { [matchField]: matchValue },
      { $addToSet: { images: imageId } }
    );

    if (result.matchedCount === 0) return NextResponse.json({ success: false }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
