import { type NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE!;

export async function POST(request: NextRequest) {
  try {
    const { filename, imageId } = await request.json();
    if (!filename || !imageId) {
      return NextResponse.json({ error: "filename et imageId sont requis" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DBNAME);

    const result = await db.collection("luminaires").updateOne(
      { filename: filename },
      { $addToSet: { images: imageId } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: `Aucun luminaire trouvé pour le filename: ${filename}` }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
