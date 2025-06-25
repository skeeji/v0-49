// Fichier : app/api/reset/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getBucket } from "@/lib/gridfs";
import { ObjectId } from "mongodb";

export async function DELETE() {
  console.log("Début de la réinitialisation complète : base de données ET GridFS...");
  try {
    const client = await clientPromise;
    const db = client.db();
    const bucket = await getBucket();

    // Vider la collection luminaires
    await db.collection("luminaires").deleteMany({});
    console.log("Collection 'luminaires' vidée.");

    // Vider la collection designers
    await db.collection("designers").deleteMany({});
    console.log("Collection 'designers' vidée.");

    // Vider la configuration de la vidéo d'accueil
    await db.collection("settings").deleteMany({});
    console.log("Collection 'settings' vidée.");

    // Vider les fichiers stockés dans GridFS
    // C'est la méthode la plus propre pour supprimer tous les fichiers
    await db.collection("images.files").deleteMany({});
    await db.collection("images.chunks").deleteMany({});
    console.log("Stockage d'images (GridFS) vidé.");

    return NextResponse.json({ success: true, message: "Toutes les collections de données ont été réinitialisées." });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation des collections:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de la réinitialisation" }, { status: 500 });
  }
}
