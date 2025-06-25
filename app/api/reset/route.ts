// app/api/reset/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getBucket } from "@/lib/gridfs";

export async function DELETE() {
  console.log("Début de la réinitialisation complète : base de données ET GridFS...");
  try {
    const client = await clientPromise;
    const db = client.db("gersaint");
    const bucket = await getBucket();

    // Vider les collections de données
    await db.collection("luminaires").deleteMany({});
    console.log("Collection 'luminaires' vidée.");
    await db.collection("designers").deleteMany({});
    console.log("Collection 'designers' vidée.");
    await db.collection("settings").deleteMany({});
    console.log("Collection 'settings' vidée.");

    // Vider TOUS les fichiers de GridFS. C'est la méthode la plus propre.
    await bucket.drop();
    console.log("Stockage de fichiers (GridFS) vidé avec bucket.drop().");

    return NextResponse.json({ success: true, message: "Toutes les données ont été réinitialisées." });
  } catch (error: any) {
    // Gérer le cas où le bucket n'existe pas (il est déjà vide)
    if (error.codeName === 'NamespaceNotFound') {
      console.log("GridFS était déjà vide, réinitialisation réussie.");
       return NextResponse.json({ success: true, message: "Données réinitialisées. Le stockage de fichiers était déjà vide." });
    }
    console.error("Erreur lors de la réinitialisation:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de la réinitialisation" }, { status: 500 });
  }
}
