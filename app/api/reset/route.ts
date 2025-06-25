// Fichier : app/api/reset/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getBucket } from "@/lib/gridfs";

const DBNAME = "gersaint";

export async function DELETE() {
  console.log("--- DÉBUT DE LA RÉINITIALISATION COMPLÈTE DU SERVEUR ---");
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);

    // Vider les collections de données
    await db.collection("luminaires").deleteMany({});
    console.log("✅ Collection 'luminaires' vidée.");
    
    await db.collection("designers").deleteMany({});
    console.log("✅ Collection 'designers' vidée.");

    await db.collection("settings").deleteMany({});
    console.log("✅ Collection 'settings' vidée.");

    // Vider TOUS les fichiers de GridFS
    try {
        const bucket = await getBucket();
        await bucket.drop();
        console.log("✅ Stockage de fichiers (GridFS) vidé.");
    } catch (error: any) {
        if (error.message.includes('ns not found')) {
            console.log("🟡 GridFS était déjà vide.");
        } else {
            throw error; // Relancer les autres erreurs
        }
    }

    return NextResponse.json({ success: true, message: "Toutes les données ont été réinitialisées avec succès." });
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de la réinitialisation." }, { status: 500 });
  }
}
