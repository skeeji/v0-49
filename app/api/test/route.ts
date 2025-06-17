import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb"; // Utilisation d'un chemin relatif plus sûr pour les API
import { ObjectId } from "mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE;

if (!DBNAME) {
  // Cette erreur arrête le build si la variable n'est pas définie, ce qui est une bonne chose.
  throw new Error('Variable d\'environnement manquante ou invalide: "MONGO_INITDB_DATABASE"');
}

export async function GET() {
  try {
    console.log("API de Test: Démarrage...");
    const client = await clientPromise;
    const db = client.db(DBNAME);
    console.log("API de Test: Connecté à la base de données.");

    // Crée un luminaire de test unique pour être sûr de ne pas avoir de conflit
    const testLuminaire = {
      _id: new ObjectId(),
      nom: `Lampe de Test - ${new Date().getTime()}`,
      designer: "Debug Joe",
      annee: 2025,
      filename: `test-image-${new Date().getTime()}.jpg`,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1. Tente d'écrire dans la base de données
    console.log("API de Test: Tentative d'insertion...", testLuminaire);
    const insertResult = await db.collection("luminaires").insertOne(testLuminaire);
    console.log("API de Test: Insertion réussie. ID:", insertResult.insertedId);

    // 2. Tente de relire les données
    console.log("API de Test: Tentative de relecture...");
    const luminairesFromDB = await db.collection("luminaires").find({}).sort({createdAt: -1}).limit(5).toArray();
    console.log(`API de Test: Relecture réussie. ${luminairesFromDB.length} documents trouvés.`);

    // 3. Si tout a fonctionné, renvoie un succès
    return NextResponse.json({
      message: "✅ TEST RÉUSSI : Connexion, écriture et lecture dans MongoDB fonctionnent.",
      dernierLuminaireCree: testLuminaire,
      premiersLuminairesTrouves: luminairesFromDB,
    });

  } catch (error: any) {
    console.error("❌ ERREUR DANS L'API DE TEST:", error);
    // Renvoie une erreur claire si quelque chose a échoué
    return NextResponse.json(
      { 
        message: "❌ TEST ÉCHOUÉ", 
        error: error.message,
        stack: error.stack 
      },
      { status:
