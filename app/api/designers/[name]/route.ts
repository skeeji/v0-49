// Fichier : app/api/designers/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE;

if (!DBNAME) {
  throw new Error('Invalid/Missing environment variable: "MONGO_INITDB_DATABASE"');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const { slug } = params;
    const body = await request.json();

    if (!slug) {
      return NextResponse.json({ success: false, error: "Slug manquant" }, { status: 400 });
    }

    const { images } = body;

    if (!images || !Array.isArray(images)) {
      return NextResponse.json({ success: false, error: "Le champ 'images' doit être un tableau" }, { status: 400 });
    }

    const result = await db.collection("designers").updateOne(
      { slug: slug },
      { $set: { images: images, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
        return NextResponse.json({ success: false, error: "Designer non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error(`Erreur API /api/designers/${params.slug} PUT:`, error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
