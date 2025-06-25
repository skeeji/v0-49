// Fichier : app/api/reset/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import fs from "fs"; // Module pour interagir avec les fichiers du disque
import path from "path"; // Module pour construire les chemins de fichiers

export async function DELETE() {
  console.log("Début de la réinitialisation complète : base de données ET fichiers...");

  try {
    const client = await clientPromise;
    const db = client.db();

    // --- Étape 1: Récupérer tous les chemins de fichiers depuis la DB ---
    const luminaires = await db.collection("luminaires").find({}, { projection: { images: 1 } }).toArray();
    const designers = await db.collection("designers").find({}, { projection: { images: 1 } }).toArray();
    const settings = await db.collection("settings").findOne({ _id: "site_config" });

    // On crée une seule grande liste de tous les chemins d'images
    const allImagePaths = [
        ...luminaires.flatMap(l => l.images || []),
        ...designers.flatMap(d => d.images || [])
    ];
    
    // On ajoute le chemin de la vidéo s'il existe
    if (settings?.welcomeVideoPath) { // Supposons que le chemin est stocké ici
        allImagePaths.push(settings.welcomeVideoPath);
    }
    
    console.log(`Trouvé ${allImagePaths.length} chemins de fichiers à supprimer.`);

    // --- Étape 2: Supprimer chaque fichier physique du disque ---
    let deletedFilesCount = 0;
    for (const relativePath of allImagePaths) {
      try {
        // On construit le chemin absolu vers le fichier dans le dossier 'public'
        // C'est l'étape la plus importante.
        const fullPath = path.join(process.cwd(), "public", relativePath);
        
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath); // On supprime le fichier
          deletedFilesCount++;
        }
      } catch (fileError) {
        console.warn(`Impossible de supprimer le fichier ${relativePath}:`, fileError);
      }
    }
    console.log(`${deletedFilesCount} fichiers ont été supprimés du disque.`);

    // --- Étape 3: Vider les collections dans la base de données ---
    await db.collection("luminaires").deleteMany({});
    await db.collection("designers").deleteMany({});
    await db.collection("settings").deleteMany({});
    // On vide aussi les références GridFS au cas où
    await db.collection("images.files").deleteMany({});
    await db.collection("images.chunks").deleteMany({});
    
    console.log("Toutes les collections de données ont été vidées.");

    return NextResponse.json({ 
      success: true, 
      message: `Réinitialisation complète terminée. ${deletedFilesCount} fichiers supprimés.`
    });

  } catch (error) {
    console.error("Erreur majeure lors de la réinitialisation:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
