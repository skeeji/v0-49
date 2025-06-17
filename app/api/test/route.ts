import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb"; // On garde le chemin relatif, c'est plus sûr
import { ObjectId } from "mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE;

if (!DBNAME) {
  throw new Error('Variable d\'environnement manquante ou invalide: "MONGO_INITDB_DATABASE"');
}

export async function GET() {
  try {
    console.log("API de Test: Démarrage...");
    const client = await clientPromise;
    const db = client.db(DBNAME);
    console.log("API de Test: Connecté à la base de données.");

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

    console.log("API de Test: Tentative d'insertion...", testLuminaire);
    await db.collection("luminaires").insertOne(testLuminaire);
    console.log("API de Test: Insertion réussie.");

    console.log("API de Test: Tentative de relecture...");
    const luminairesFromDB = await db.collection("luminaires").find({}).sort({createdAt: -1}).limit(5).toArray();
    console.log(`API de Test: Relecture réussie. ${luminairesFromDB.length} documents trouvés.`);

    return NextResponse.json({
      message: "✅ TEST RÉUSSI : Connexion, écriture et lecture dans MongoDB fonctionnent.",
      dernierLuminaireCree: testLuminaire,
      premiersLuminairesTrouves: luminairesFromDB,
    });

  } catch (error: any) {
    console.error("❌ ERREUR DANS L'API DE TEST:", error);
    return NextResponse.json(
      { 
        message: "❌ TEST ÉCHOUÉ", 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
