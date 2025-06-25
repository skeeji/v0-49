import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function DELETE() {
  try {
    const client = await clientPromise;
    const db = client.db();
    await db.collection("luminaires").deleteMany({});
    await db.collection("designers").deleteMany({});
    // Note: ceci ne supprime pas les fichiers de GridFS, juste les références
    return NextResponse.json({ success: true, message: "Collections vidées." });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
