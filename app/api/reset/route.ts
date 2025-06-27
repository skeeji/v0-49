// Fichier : app/api/reset/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getBucket } from "@/lib/gridfs"; // On importe la fonction pour accéder au bucket GridFS

export async function DELETE() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const bucket = await getBucket(); // On initialise le bucket 'media'

    console.log("--- DÉBUT DE LA RÉINITIALISATION COMPLÈTE DU SERVEUR ---");

    // Étape 1 : Vider les collections de données
    await db.collection("luminaires").deleteMany({});
    console.log("✅ Collection 'luminaires' vidée.");
    
    await db.collection("designers").deleteMany({});
    console.log("✅ Collection 'designers' vidée.");

    await db.collection("settings").deleteMany({});
    console.log("✅ Collection 'settings' (vidéo d'accueil) vidée.");

    // Étape 2 : Supprimer tous les fichiers stockés dans GridFS
    // La commande bucket.drop() est la plus efficace : elle supprime les collections
    // 'media.files' et 'media.chunks' entièrement.
    await bucket.drop();
    console.log("✅ Stockage de fichiers GridFS ('media') complètement supprimé.");

    return NextResponse.json({ 
      success: true, 
      message: "Réinitialisation complète terminée : toutes les données et tous les fichiers ont été supprimés." 
    });

  } catch (error: any) {
    // Si bucket.drop() échoue car les collections n'existent pas, ce n'est pas grave.
    if (error.codeName === 'NamespaceNotFound') {
      console.log("⚠️ Stockage de fichiers GridFS déjà vide. Opération terminée.");
      return NextResponse.json({ 
        success: true, 
        message: "Données réinitialisées. Aucun fichier à supprimer." 
      });
    }

    console.error("❌ Erreur grave lors de la réinitialisation complète:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de la réinitialisation." }, { status: 500 });
  }
}
