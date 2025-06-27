// Fichier : app/api/reset/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function DELETE() {
  try {
    const client = await clientPromise;
    const db = client.db();

    console.log("Début de la réinitialisation complète...");

    await db.collection("luminaires").deleteMany({});
    console.log("Collection 'luminaires' vidée.");

    await db.collection("designers").deleteMany({});
    console.log("Collection 'designers' vidée.");

    await db.collection("settings").deleteMany({});
    console.log("Collection 'settings' vidée.");

    // On cible les collections du bucket "media" pour supprimer les fichiers
    await db.collection('media.files').deleteMany({});
    await db.collection('media.chunks').deleteMany({});
    console.log("Collections GridFS (media.files, media.chunks) vidées.");

    return NextResponse.json({ success: true, message: "Réinitialisation complète (Données + Fichiers) terminée." });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation complète:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de la réinitialisation." }, { status: 500 });
  }
}
