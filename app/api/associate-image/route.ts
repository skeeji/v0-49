import { type NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE!;

export async function POST(request: NextRequest) {
  try {
    const { entity, matchField, matchValue, imageId } = await request.json();

    if (!entity || !matchField || !matchValue || !imageId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    if (!['luminaires', 'designers'].includes(entity)) {
      return NextResponse.json({ error: "Entité non valide" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DBNAME);

    const result = await db.collection(entity).updateOne(
      { [matchField]: matchValue },
      { $addToSet: { images: imageId } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: `Aucun document trouvé pour ${matchField}=${matchValue}` }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Image associée" });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
