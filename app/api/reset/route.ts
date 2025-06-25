// Fichier : app/api/reset/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getBucket } from "@/lib/gridfs"; // On importe notre aide pour GridFS
import { ObjectId } from "mongodb";
import fs from "fs"; // Module pour interagir avec les fichiers du disque
import path from "path"; // Module pour construire les chemins de fichiers

export async function DELETE() {
  console.log("Début de la réinitialisation complète : base de données ET fichiers...");
  try {
    const client = await clientPromise;
    const db = client.db();
    const bucket = await getBucket();

    // --- Étape 1 : Récupérer tous les fichiers à supprimer ---
    
    // a) Fichiers images stockés dans GridFS
    const imageFiles = await db.collection("images.files").find({}, { projection: { _id: 1 } }).toArray();
    console.log(`Trouvé ${imageFiles.length} fichiers images dans GridFS.`);
    
    // b) Vidéo d'accueil
    const settings = await db.collection("settings").findOne({ _id: "site_config" });


    // --- Étape 2: Supprimer chaque fichier de GridFS ---
    let deletedGridFSCount = 0;
    for (const file of imageFiles) {
        try {
            await bucket.delete(new ObjectId(file._id));
            deletedGridFSCount++;
        } catch (e) {
            console.warn(`Impossible de supprimer le fichier GridFS ${file._id}`);
        }
    }
    // Suppression de la vidéo d'accueil
    if (settings?.welcomeVideoId) {
        try {
            await bucket.delete(new ObjectId(settings.welcomeVideoId));
            deletedGridFSCount++;
        } catch (e) {
            console.warn(`Impossible de supprimer la vidéo GridFS ${settings.welcomeVideoId}`);
        }
    }
    console.log(`${deletedGridFSCount} fichiers supprimés de GridFS.`);


    // --- Étape 3: Vider les collections dans la base de données ---
    await db.collection("luminaires").deleteMany({});
    console.log("Collection 'luminaires' vidée.");

    await db.collection("designers").deleteMany({});
    console.log("Collection 'designers' vidée.");

    await db.collection("settings").deleteMany({});
    console.log("Collection 'settings' vidée.");
    
    return NextResponse.json({ 
      success: true, 
      message: `Réinitialisation complète terminée. ${deletedGridFSCount} fichiers et toutes les données ont été supprimés.`
    });

  } catch (error) {
    console.error("Erreur majeure lors de la réinitialisation:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
